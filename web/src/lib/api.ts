const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface SearchRow {
  id: number;
  term: string;
  slug: string;
  shortVi: string;
  category: string | null;
  similarity: number;
}

export interface Term {
  id: number;
  term: string;
  slug: string;
  ipa: string | null;
  category: string | null;
  shortVi: string;
  contentMd: string;
  relatedTerms: string[];
  source: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.message ?? body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function searchTerms(q: string): Promise<{ query: string; results: SearchRow[] }> {
  return request(`/api/terms/search?q=${encodeURIComponent(q)}`);
}

export function getTerm(slug: string): Promise<{ term: Term }> {
  return request(`/api/terms/${slug}`);
}

export interface EnrichStreamOptions {
  signal?: AbortSignal;
  /** Gọi mỗi khi nhận delta text từ AI. */
  onDelta?: (text: string) => void;
}

/**
 * Enrich qua SSE: nhận delta text dần dần, resolve khi server gửi `done`
 * (term đã được validate + lưu DB). Server gửi `error` → throw.
 */
export async function enrichTermStream(
  term: string,
  opts: EnrichStreamOptions = {},
): Promise<{ term: Term; created: boolean }> {
  const res = await fetch(`${API_BASE}/api/terms/enrich`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ term }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.message ?? body?.error ?? `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = block.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6)) as
        | { type: 'delta'; text: string }
        | { type: 'done'; term: Term; created: boolean }
        | { type: 'error'; message: string };
      if (payload.type === 'delta') {
        opts.onDelta?.(payload.text);
      } else if (payload.type === 'done') {
        return { term: payload.term, created: payload.created };
      } else {
        throw new Error(payload.message);
      }
    }
  }
  throw new Error('Kết nối stream kết thúc bất thường.');
}
