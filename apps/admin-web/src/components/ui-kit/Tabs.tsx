'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface TabDefinition<T extends string> {
  value: T;
  label: string;
  /** Shown after the label, e.g. a document count. */
  badge?: number;
}

export interface TabsProps<T extends string> {
  tabs: TabDefinition<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the set for screen readers, e.g. "Worker details". */
  label: string;
  className?: string;
}

/**
 * An underlined tab strip.
 *
 * A hairline rule across the full width with the active tab's segment in ink,
 * rather than a pill group — tabs switch a whole region, and a pill group reads
 * as a filter on content that is already visible. Implemented with the ARIA tab
 * pattern so arrow keys move between them.
 *
 * The panels are rendered by the caller; this is the strip only.
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: TabsProps<T>) {
  const base = useId();

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.value === value);
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next) onChange(next.value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex items-center gap-1 border-b border-hairline', className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`${base}-${tab.value}`}
            aria-selected={isActive}
            aria-controls={`${base}-${tab.value}-panel`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-table font-medium transition-colors',
              isActive
                ? 'border-marigold text-ink'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {tab.label}
            {tab.badge === undefined ? null : (
              <span
                className={cn(
                  'tabular rounded-pill px-1.5 py-0.5 text-[11px]',
                  isActive ? 'bg-marigold-tint text-ink' : 'bg-hairline/70 text-muted',
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
