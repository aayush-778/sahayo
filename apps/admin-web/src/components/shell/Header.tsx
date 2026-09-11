'use client';

import { Bell, ChevronDown, Search, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui-kit/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { findNavItem } from '@/lib/nav/routes';
import { CURRENT_ADMIN } from '@/lib/nav/session';

/** Every header control is a hairline-bordered pill on the surface colour. */
const CONTROL =
  'inline-flex h-9 items-center justify-center rounded-pill border border-hairline bg-surface text-muted transition-colors hover:text-ink';

/**
 * Fixed page header. The title and subtitle come from the nav model, so a route
 * cannot be called one thing in the sidebar and another thing here.
 */
export function Header() {
  const pathname = usePathname();
  const active = findNavItem(pathname);

  return (
    <header className="flex h-16 flex-none items-center justify-between gap-6 border-b border-hairline bg-surface px-8">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-[-0.02em] text-ink">
          {active?.label ?? 'Sahayo'}
        </h1>
        <p className="truncate text-pill text-muted">
          {active?.subtitle ?? 'Cooperative gig services, run by its workers'}
        </p>
      </div>

      <div className="flex flex-none items-center gap-2">
        <label className="relative hidden items-center md:inline-flex">
          <Search
            size={18}
            strokeWidth={1.5}
            aria-hidden
            className="pointer-events-none absolute left-3 text-muted"
          />
          <span className="sr-only">Search workers, bookings, and disputes</span>
          <input
            type="search"
            placeholder="Search"
            className="h-9 w-56 rounded-pill border border-hairline bg-surface pl-9 pr-3 text-table text-ink placeholder:text-muted"
          />
        </label>

        <button type="button" className={`${CONTROL} relative w-9`}>
          <span className="sr-only">Notifications, unread</span>
          <Bell size={18} strokeWidth={1.5} aria-hidden />
          {/* Unread marker. The screen-reader label above carries the same fact. */}
          <span
            aria-hidden
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral ring-2 ring-surface"
          />
        </button>

        <button type="button" className={`${CONTROL} w-9`}>
          <span className="sr-only">Open settings</span>
          <Settings size={18} strokeWidth={1.5} aria-hidden />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className={`${CONTROL} gap-2 pl-1 pr-2.5`}>
            <Avatar name={CURRENT_ADMIN.name} src={CURRENT_ADMIN.avatarUrl} size={28} />
            <span className="hidden text-table font-semibold text-ink lg:inline">
              {CURRENT_ADMIN.name}
            </span>
            <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{CURRENT_ADMIN.role}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
