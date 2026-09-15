import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Sparkles, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { searchTerms, getTerm, enrichTerm, type SearchRow, type Term } from '@/lib/api';
import TermDetail from '@/components/TermDetail';

export default function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Term | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const data = await searchTerms(trimmed);
      setResults(data.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search-as-you-type
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => void runSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  async function openTerm(slug: string) {
    setLoadingDetail(true);
    try {
      const data = await getTerm(slug);
      setSelected(data.term);
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  /** Chip click / miss-card button: server returns existing term or enriches via AI. */
  async function loadOrEnrich(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setLoadingDetail(true);
    setEnriching(true);
    setEnrichError(null);
    try {
      const data = await enrichTerm(trimmed);
      setSelected(data.term);
      setResults((prev) => {
        const row: SearchRow = {
          id: data.term.id,
          term: data.term.term,
          slug: data.term.slug,
          shortVi: data.term.shortVi,
          category: data.term.category,
          similarity: 1,
        };
        return [row, ...prev.filter((r) => r.slug !== row.slug)];
      });
    } catch (err) {
      setEnrichError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingDetail(false);
      setEnriching(false);
    }
  }

  const noResults = !searching && query.trim().length > 0 && results.length === 0;

  return (
    <div className="flex min-h-screen flex-col px-5 pb-16">
      <header className="flex items-center gap-2 py-6">
        <BookOpen className="size-5 text-accent" />
        <h1 className="font-display text-xl font-semibold tracking-tight">Footwear Words</h1>
        <Badge className="ml-2">footwear development glossary</Badge>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm thuật ngữ footwear... (VD: Derby, lasting, welt)"
          className="pl-12 text-lg"
        />
      </div>

      {searchError && <p className="mt-4 text-sm text-red-400">Lỗi tìm kiếm: {searchError}</p>}

      <div className="mt-6 grid flex-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          {searching && (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}

          {!searching &&
            results.map((r) => (
              <button
                key={r.slug}
                onClick={() => void openTerm(r.slug)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  selected?.slug === r.slug
                    ? 'border-accent/60 bg-panel-strong'
                    : 'border-border bg-panel hover:border-accent/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{r.term}</span>
                  {r.category && <Badge>{r.category}</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{r.shortVi}</p>
              </button>
            ))}

          {/* Enrich-on-miss */}
          {noResults && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-start gap-3 p-5">
                <p className="text-sm text-muted">
                  Chưa có <span className="font-semibold text-foreground">“{query.trim()}”</span> trong
                  bộ từ. Hỏi AI để giải thích và lưu vào từ điển.
                </p>
                {enrichError && <p className="text-sm text-red-400">{enrichError}</p>}
                <Button onClick={() => void loadOrEnrich(query.trim())} disabled={enriching}>
                  <Sparkles />
                  {enriching ? 'Đang hỏi AI...' : `Enrich “${query.trim()}” bằng AI`}
                </Button>
                {enriching && (
                  <div className="w-full space-y-2 pt-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail column */}
        <div className="mx-auto w-full max-w-3xl">
          {loadingDetail && (
            <div className="space-y-3">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
          {!loadingDetail && enrichError && selected && (
            <p className="mb-3 text-sm text-red-400">{enrichError}</p>
          )}
          {!loadingDetail && selected && (
            <TermDetail term={selected} onTermClick={(t) => void loadOrEnrich(t)} />
          )}
          {!loadingDetail && !selected && (
            <div className="flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted">
                Chọn một thuật ngữ để xem giải thích chi tiết
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
