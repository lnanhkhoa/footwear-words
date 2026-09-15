import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border-2 border-border bg-chip px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-chip-foreground',
        className,
      )}
      {...props}
    />
  );
}
