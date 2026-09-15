import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { searchTerms, getBySlug, getOrEnrich } from './services/terms.js';
import { z } from 'zod';

// Portable Hono app — no runtime-specific bindings here.
// Node/Bun entry (index.ts) wraps this; Cloudflare Workers / Supabase Edge
// can `export default app` later with a compatible Postgres driver.
export const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true }));

app.get('/api/terms/search', async (c) => {
  const q = c.req.query('q') ?? '';
  const results = await searchTerms(q);
  return c.json({ query: q, results });
});

app.get('/api/terms/:slug', async (c) => {
  const term = await getBySlug(c.req.param('slug'));
  if (!term) return c.json({ error: 'not_found' }, 404);
  return c.json({ term });
});

const EnrichBody = z.object({ term: z.string().min(1) });

app.post('/api/terms/enrich', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }
  const parsed = EnrichBody.safeParse(body);
  if (!parsed.success) return c.json({ error: 'term_required' }, 400);
  const term = parsed.data.term.trim();

  try {
    const { term: saved, created } = await getOrEnrich(term);
    return c.json({ term: saved, created });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: 'enrich_failed', message }, 502);
  }
});

export default app;
