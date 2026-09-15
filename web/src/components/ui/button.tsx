import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 border-border text-sm font-bold transition-[transform,box-shadow,background-color,color,border-color] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent-ink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary volt: hover "đè" nút xuống — shadow thu về 0, transform thay layout.
        default:
          'bg-accent text-accent-foreground shadow-hard-sm hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
        secondary:
          'bg-panel text-foreground shadow-hard-sm hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none',
        ghost: 'border-transparent text-muted hover:bg-panel-strong hover:text-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-6 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
