import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Sparkles, BookOpen, Footprints, Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { searchTerms, getTerm, enrichTerm, type SearchRow, type Term } from '@/lib/api';
import { useTheme } from '@/lib/use-theme';
import { cn } from '@/lib/utils';
import TermDetail from '@/components/TermDetail';

const SUGGESTIONS = ['Derby', 'Goodyear Welt', 'Lasting', 'Outsole', 'Blake Stitch'];

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
  const { theme, toggle } = useTheme();

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
  const hasQuery = query.trim().length > 0;
  const showWorkspace = hasQuery || selected !== null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-3">
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setSelected(null);
              setSearchError(null);
              setEnrichError(null);
            }}
            aria-label="Footwear Words — về trang chủ"
            className="group flex min-w-0 cursor-pointer items-center gap-3 rounded-lg outline-none transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-border bg-accent shadow-hard-sm transition-transform duration-150 group-hover:-rotate-6">
              <Footprints className="size-5 text-accent-foreground" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col items-start">
              <span className="font-display text-lg uppercase leading-none tracking-wide">
                Footwear Words
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                footwear glossary · tiếng Việt
              </span>
            </span>
          </button>
          <Button
            variant="ghost"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            className="ml-auto size-9 rounded-lg p-0"
          >
            {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-7">
        {!showWorkspace && (
          <section className="mx-auto w-full max-w-3xl pb-14 pt-12 text-center sm:pt-16">
            <Badge className="-rotate-2 bg-accent text-accent-foreground">
              từ điển sống · AI tự học từ mới
            </Badge>
            <h1 className="mt-6 font-display text-[clamp(2.6rem,7vw,4.75rem)] uppercase leading-[0.95] tracking-wide">
              Nói{' '}
              <span className="inline-block -rotate-1 bg-accent px-2 text-accent-foreground">
                giày
              </span>{' '}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
              Tra thuật ngữ footwear chuẩn ngành với giải thích tiếng Việt dễ hiểu. Thiếu từ? AI bổ
              sung ngay và lưu vĩnh viễn vào từ điển.
            </p>
          </section>
        )}

        <div className="relative mx-auto w-full max-w-2xl">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm thuật ngữ footwear... (VD: Derby, lasting, welt)"
            aria-label="Tìm thuật ngữ footwear"
            className="h-14 rounded-full pl-14 pr-5 shadow-hard-sm focus-visible:shadow-hard"
          />
        </div>

        {!showWorkspace && (
          <div className="mx-auto mt-6 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted">Thử:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void loadOrEnrich(s)}
                className="cursor-pointer rounded-full border-2 border-border bg-panel px-3 py-1 text-xs font-semibold transition-colors duration-150 hover:bg-accent hover:text-accent-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {searchError && (
          <p className="mt-4 text-center text-sm font-medium text-danger">
            Lỗi tìm kiếm: {searchError}
          </p>
        )}

        {showWorkspace && (
          <div className="mt-12 grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              {searching && (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              )}

              {!searching &&
                results.map((r) => {
                  const active = selected?.slug === r.slug;
                  return (
                    <button
                      key={r.slug}
                      onClick={() => void openTerm(r.slug)}
                      className={cn(
                        'cursor-pointer rounded-xl border-2 border-border bg-panel px-4 py-3 text-left transition-all duration-150',
                        active
                          ? 'bg-accent text-accent-foreground shadow-hard'
                          : 'hover:-translate-y-0.5 hover:shadow-hard-sm',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{r.term}</span>
                        {r.category && <Badge>{r.category}</Badge>}
                      </div>
                      <p
                        className={cn(
                          'mt-1 line-clamp-2 text-sm',
                          active ? 'text-accent-foreground/75' : 'text-muted',
                        )}
                      >
                        {r.shortVi}
                      </p>
                    </button>
                  );
                })}

              {/* Enrich-on-miss */}
              {noResults && (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-start gap-3 p-5">
                    <p className="text-sm text-muted">
                      Chưa có{' '}
                      <span className="font-bold text-foreground">“{query.trim()}”</span> trong bộ
                      từ. Hỏi AI để giải thích và lưu vào từ điển.
                    </p>
                    {enrichError && <p className="text-sm font-medium text-danger">{enrichError}</p>}
                    <Button onClick={() => void loadOrEnrich(query.trim())} disabled={enriching}>
                      <Sparkles aria-hidden />
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
                  <Skeleton className="h-10 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-64 w-full" />
                </div>
              )}
              {!loadingDetail && enrichError && selected && (
                <p className="mb-3 text-sm font-medium text-danger">{enrichError}</p>
              )}
              {!loadingDetail && selected && (
                <TermDetail term={selected} onTermClick={(t) => void loadOrEnrich(t)} />
              )}
              {!loadingDetail && !selected && (
                <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/50 p-8 text-center">
                  <BookOpen className="size-6 text-muted" aria-hidden />
                  <p className="text-sm text-muted">
                    Chọn một thuật ngữ để xem giải thích chi tiết
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t-2 border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-xs text-muted">
          <span className="font-bold uppercase tracking-widest">Footwear Words</span>
          <span>Tra nhanh · Hiểu kỹ · AI tự bổ sung</span>
        </div>
      </footer>
    </div>
  );
}
