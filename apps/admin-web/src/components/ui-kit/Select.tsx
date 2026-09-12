'use client';

import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  /** Empty string means "no filter", and shows `allLabel`. */
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** The option shown for the empty value, e.g. "All categories". */
  allLabel: string;
  className?: string;
}

/**
 * A filter dropdown, built on a native `<select>`.
 *
 * Native rather than a Radix listbox on purpose: a filter bar has four of these
 * side by side, they carry no rich content, and the platform control is already
 * keyboard-accessible, screen-reader-correct, and correct on touch. A custom
 * listbox here would be more code doing less.
 *
 * The chevron is ours; the browser's own arrow is removed with `appearance-none`.
 */
export function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: SelectProps) {
  const id = useId();

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-pill font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-pill border border-hairline bg-surface pl-3 pr-8 text-table text-ink"
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    </div>
  );
}
