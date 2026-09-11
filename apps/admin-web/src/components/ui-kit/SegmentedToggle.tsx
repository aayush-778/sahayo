'use client';

import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedToggleProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Describes what the control switches, for screen readers. */
  label: string;
  className?: string;
}

/**
 * Day / Month / Year and its siblings. A hairline track with a marigold-tint
 * active segment. Rendered as a real radio group so arrow keys work and the
 * current selection is announced.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedToggleProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-pill border border-hairline bg-ground p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-pill font-semibold transition-colors',
              isActive ? 'bg-marigold-tint text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
