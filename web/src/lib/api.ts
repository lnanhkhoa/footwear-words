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

export function enrichTerm(term: string): Promise<{ term: Term; created: boolean }> {
  return request('/api/terms/enrich', { method: 'POST', body: JSON.stringify({ term }) });
}
