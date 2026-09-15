import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Term } from '@/lib/api';

interface Props {
  term: Term;
  onTermClick: (term: string) => void;
}

export default function TermDetail({ term, onTermClick }: Props) {
  return (
    <article className="rounded-2xl border-2 border-border bg-panel p-6 shadow-hard sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-4xl uppercase leading-none tracking-wide">{term.term}</h2>
        {term.ipa && <span className="font-mono text-sm text-muted">{term.ipa}</span>}
        {term.category && <Badge>{term.category}</Badge>}
        {term.source === 'ai' && (
          <Badge className="border-accent bg-accent/20 text-accent-ink">
            <Sparkles className="size-3" aria-hidden />
            AI enriched
          </Badge>
        )}
      </div>

      <p className="mt-4 text-base leading-relaxed text-muted">{term.shortVi}</p>

      <div className="markdown-body mt-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{term.contentMd}</ReactMarkdown>
      </div>

      {term.relatedTerms.length > 0 && (
        <div className="mt-6 border-t-2 border-border pt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">
            Thuật ngữ liên quan
          </p>
          <div className="flex flex-wrap gap-2">
            {term.relatedTerms.map((t) => (
              <button key={t} onClick={() => onTermClick(t)}>
                <Badge className="cursor-pointer transition-colors duration-150 hover:border-accent hover:bg-accent hover:text-accent-foreground">
                  {t}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
