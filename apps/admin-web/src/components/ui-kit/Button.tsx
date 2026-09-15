import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'approve' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** An 18px lucide icon, rendered before the label. */
  icon?: ReactNode;
}

/**
 * The product's button.
 *
 * Written here rather than taken from the shadcn registry so the variants speak
 * the design system's language: pill radii, no shadows, and a `danger` variant
 * that is a coral OUTLINE. A filled coral button is banned — coral means "this
 * needs care", and a big solid block of it reads as the primary action on the
 * screen, which a reject or a suspend never is.
 *
 * Every label should be a verb naming its effect: "Approve worker", not "Submit".
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-marigold text-ink hover:bg-marigold/85',
  /* Fund-green means a worker was verified or money reached them. Ink text, because white on this green fails contrast. */
  approve: 'bg-fund-green text-ink hover:bg-fund-green/85',
  outline: 'border border-hairline bg-surface text-ink hover:bg-marigold-tint/40',
  danger: 'border border-coral bg-surface text-ink hover:bg-coral/10',
  ghost: 'text-muted hover:bg-marigold-tint/40 hover:text-ink',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-pill',
  md: 'h-9 gap-2 px-4 text-table',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'outline', size = 'md', icon, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex flex-none items-center justify-center whitespace-nowrap rounded-pill font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});
