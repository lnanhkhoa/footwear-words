import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/** Preview render dần output AI: head `KEY: value` + `---` + markdown. */
export default function StreamDetail({ text }: { text: string }) {
  const sep = text.match(/^---[ \t]*\r?\n?/m);
  const head = sep?.index !== undefined ? text.slice(0, sep.index) : text;
  const md = sep ? text.slice((sep.index ?? 0) + sep[0].length) : '';
  const termName = head.match(/^TERM:(.*)$/m)?.[1]?.trim() || '…';

  return (
    <article className="rounded-2xl border-2 border-border bg-panel p-6 shadow-hard sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-4xl uppercase leading-none tracking-wide">{termName}</h2>
        <Badge className="border-accent bg-accent/20 text-accent-ink">
          <Sparkles className="size-3" aria-hidden />
          AI đang viết
        </Badge>
      </div>

      <div className="markdown-body mt-4">
        {md ? (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
            <span
              className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-accent align-middle"
              aria-hidden
            />
          </>
        ) : (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
      </div>
    </article>
  );
}
