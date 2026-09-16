import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import { z } from 'zod';
import { searchTerms, getBySlug, findByTerm, upsertEnriched } from './services/terms.js';
import { buildEnrichMessages, parseEnrichOutput } from './services/enrich.js';
import type { Term } from './db/schema.js';
import { chatStream } from './ai/zai.js';
import { rateLimit } from './lib/rate-limit.js';

// Portable Hono app — no runtime-specific bindings here.
// Node/Bun entry (index.ts) wraps this; Cloudflare Workers / Supabase Edge
// can `export default app` later with a compatible Postgres driver.
export const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true }));

app.get('/api/terms/search', async (c) => {
  const q = c.req.query('q') ?? '';
  const results = await searchTerms(q);
  // CDN cache: index chỉ đổi khi có term mới (seed/enrich) — 5 phút là đủ tươi.
  return c.json({ query: q, results }, 200, {
    'Cache-Control': 's-maxage=300, stale-while-revalidate=86400',
  });
});

app.get('/api/terms/:slug', async (c) => {
  const term = await getBySlug(c.req.param('slug'));
  if (!term) return c.json({ error: 'not_found' }, 404);
  // Nội dung term gần như bất biến (chỉ --force reseed mới ghi lại).
  return c.json({ term }, 200, {
    'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800',
  });
});

const ENRICH_TERM_MAX = 64;
const EnrichBody = z.object({ term: z.string().trim().min(1).max(ENRICH_TERM_MAX) });

// Per-IP fixed window trên /api/terms/enrich. Request trúng DB vốn rẻ, nhưng
// mục tiêu là chặn trần số AI call một client có thể kích hoạt. Per-instance
// only — attack phân tán cần limiter dùng shared state (Upstash/DB).
const ENRICH_RATE_LIMIT = 20;
const ENRICH_WINDOW_MS = 10 * 60_000;

/** Chuẩn hoá input: gộp whitespace để 'Goodyear  Welt' trùng key với 'Goodyear Welt'. */
function normalizeTerm(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function clientIp(c: Context): string {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return c.req.header('x-real-ip') ?? 'unknown';
}

// Singleflight per term: 2 request enrich cùng từ (double click, submit trùng)
// chỉ gọi AI ĐÚNG 1 LẦN — joiner gắn vào flight đang chạy và nhận các delta
// còn lại. Reserve flight ĐỒNG BỘ trước mọi await nên không có cửa sổ race.
// Per-instance; DB check + unique upsert chặn phần còn lại.
type EnrichFlight = {
  promise: Promise<Term>;
  subscribe: (cb: (chunk: string) => void) => void;
};
const inflightEnrich = new Map<string, EnrichFlight>();

function reserveFlight(key: string): {
  settle: (t: Term) => void;
  fail: (e: unknown) => void;
  subscribers: Set<(chunk: string) => void>;
} {
  let settle!: (t: Term) => void;
  let fail!: (e: unknown) => void;
  const promise = new Promise<Term>((res, rej) => {
    settle = res;
    fail = rej;
  });
  const subscribers = new Set<(chunk: string) => void>();
  inflightEnrich.set(key, { promise, subscribe: (cb) => subscribers.add(cb) });
  return { settle, fail, subscribers };
}

app.post('/api/terms/enrich', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }
  const parsed = EnrichBody.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: 'term_invalid', message: `Thuật ngữ phải dài 1-${ENRICH_TERM_MAX} ký tự.` },
      400,
    );
  }
  const term = normalizeTerm(parsed.data.term);

  const limited = rateLimit(`enrich:${clientIp(c)}`, ENRICH_RATE_LIMIT, ENRICH_WINDOW_MS);
  if (!limited.ok) {
    return c.json(
      {
        error: 'rate_limited',
        message: `Quá nhiều yêu cầu enrich. Thử lại sau ${limited.retryAfterSec}s.`,
      },
      429,
      { 'Retry-After': String(limited.retryAfterSec) },
    );
  }

  const key = term.toLowerCase();
  const joined = inflightEnrich.get(key);
  if (joined) {
    // Joiner: nhận delta còn lại của flight đang chạy; không tạo row mới.
    return streamSSE(c, async (stream) => {
      const send = (payload: unknown) => stream.writeSSE({ data: JSON.stringify(payload) });
      joined.subscribe((chunk) => {
        void send({ type: 'delta', text: chunk }).catch(() => {});
      });
      try {
        const saved = await joined.promise;
        await send({ type: 'done', term: saved, created: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await send({ type: 'error', message }).catch(() => {});
      }
    });
  }

  const { settle, fail, subscribers } = reserveFlight(key);
  return streamSSE(c, async (stream) => {
    const send = (payload: unknown) => stream.writeSSE({ data: JSON.stringify(payload) });
    try {
      // Đã có trong từ điển → trả ngay, không gọi AI.
      const existing = await findByTerm(term);
      if (existing) {
        settle(existing);
        await send({ type: 'done', term: existing, created: false });
        return;
      }

      // Client ngắt kết nối → huỷ AI call, đừng đốt token cho người đã rời đi.
      const ac = new AbortController();
      stream.onAbort(() => ac.abort());

      let full = '';
      await chatStream(buildEnrichMessages(term), { maxTokens: 2048, signal: ac.signal }, (chunk) => {
        full += chunk;
        for (const sub of subscribers) sub(chunk);
        void send({ type: 'delta', text: chunk }).catch(() => {});
      });

      const enriched = parseEnrichOutput(full, term);
      const saved = await upsertEnriched(enriched, 'ai');
      settle(saved);
      await send({ type: 'done', term: saved, created: true });
    } catch (err) {
      fail(err);
      const message = err instanceof Error ? err.message : String(err);
      await send({ type: 'error', message }).catch(() => {});
    } finally {
      inflightEnrich.delete(key);
    }
  });
});

export default app;
