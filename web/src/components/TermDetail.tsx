import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import type { Term } from '@/lib/api';

interface Props {
  term: Term;
  onTermClick: (term: string) => void;
}

export default function TermDetail({ term, onTermClick }: Props) {
  return (
    <article className="rounded-xl border border-border bg-panel p-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-3xl font-bold tracking-tight">{term.term}</h2>
        {term.ipa && <span className="font-mono text-sm text-muted">{term.ipa}</span>}
        {term.category && <Badge>{term.category}</Badge>}
        {term.source === 'ai' && <Badge className="bg-accent/15 text-accent">AI enriched</Badge>}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{term.shortVi}</p>

      <div className="markdown-body mt-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{term.contentMd}</ReactMarkdown>
      </div>

      {term.relatedTerms.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Thuật ngữ liên quan
          </p>
          <div className="flex flex-wrap gap-2">
            {term.relatedTerms.map((t) => (
              <button key={t} onClick={() => onTermClick(t)}>
                <Badge className="cursor-pointer transition-colors hover:bg-accent/20 hover:text-accent">
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
