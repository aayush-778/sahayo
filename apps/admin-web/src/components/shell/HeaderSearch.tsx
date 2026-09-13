'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { SEARCH_MIN_LENGTH, searchPortal, type SearchGroup, type SearchResult } from '@/lib/services';
import { cn } from '@/lib/utils';

/** How long to wait after the last keystroke before searching. */
const DEBOUNCE_MS = 150;

/**
 * Search the whole portal from the header.
 *
 * A combobox: results appear under the field grouped by kind, arrow keys move through
 * them, Enter opens the highlighted one, Escape closes. Press "/" or Ctrl+K anywhere to
 * jump to the field.
 */
export function HeaderSearch() {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<SearchGroup[]>();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const flat = useMemo<SearchResult[]>(() => (groups ?? []).flatMap((group) => group.results), [groups]);
  const trimmed = query.trim();

  /* "/" or Ctrl+K focuses search, unless someone is already typing in a field. */
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((event.key === 'k' && (event.ctrlKey || event.metaKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Close when focus or a click leaves the search. */
  useEffect(() => {
    function onPointer(event: PointerEvent): void {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  useEffect(() => {
    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setGroups(undefined);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchPortal(trimmed).then((next) => {
        if (cancelled) return;
        setGroups(next);
        setActive(0);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  function go(result: SearchResult | undefined): void {
    if (!result) return;
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    router.push(result.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(flat.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(flat[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showPanel = open && trimmed.length > 0;
  let position = -1;

  return (
    <div ref={wrapperRef} className="relative hidden md:block">
      <label className="relative flex items-center">
        <Search size={18} strokeWidth={1.5} aria-hidden className="pointer-events-none absolute left-3 text-muted" />
        <span className="sr-only">Search pages, workers, customers, bookings and disputes</span>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && flat[active] ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search"
          className="h-9 w-64 rounded-pill border border-hairline bg-surface pl-9 pr-12 text-table text-ink placeholder:text-muted"
        />
        {query ? null : (
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2.5 rounded-md border border-hairline px-1.5 text-[11px] text-muted"
          >
            /
          </kbd>
        )}
      </label>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="scroll-hidden absolute right-0 top-11 z-50 max-h-[70vh] w-[26rem] overflow-y-auto rounded-tile border border-hairline bg-surface p-1.5 shadow-card"
        >
          {trimmed.length < SEARCH_MIN_LENGTH ? (
            <p className="px-3 py-2.5 text-table text-muted">Keep typing: a name, phone digits, BKG-00123 or DSP-0004.</p>
          ) : !groups ? (
            <p className="px-3 py-2.5 text-table text-muted">Searching</p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-2.5 text-table text-muted">
              Nothing matches &ldquo;{trimmed}&rdquo;. Try part of a name, the last digits of a phone number, or a booking
              reference.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.kind} role="group" aria-label={group.label} className="py-1">
                <p className="px-3 pb-1 pt-1.5 text-pill text-muted">
                  {group.label}
                  {group.total > group.results.length ? ` · showing ${group.results.length} of ${group.total}` : ''}
                </p>
                {group.results.map((result) => {
                  position += 1;
                  const index = position;
                  return (
                    <div
                      key={result.id}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === active}
                      onPointerEnter={() => setActive(index)}
                      onClick={() => go(result)}
                      className={cn(
                        'cursor-pointer rounded-md px-3 py-2',
                        index === active ? 'bg-marigold-tint' : 'hover:bg-marigold-tint/40',
                      )}
                    >
                      <p className="truncate text-table text-ink">{result.title}</p>
                      <p className="truncate text-pill text-muted">{result.detail}</p>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
