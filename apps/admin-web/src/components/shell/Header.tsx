'use client';

import { BellRing, ChevronDown, LogOut, Settings, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { cn } from '@/lib/utils';
import { HeaderSearch } from './HeaderSearch';
import { LiveStatus } from './LiveStatus';
import { NotificationBell } from './NotificationBell';

/**
 * Every header control is a hairline-bordered pill on the white surface. The
 * controls are the only white in the header — the header bar itself is
 * transparent over the cream canvas.
 */
const CONTROL =
  'inline-flex h-9 items-center justify-center rounded-pill border border-hairline bg-surface text-muted transition-colors hover:text-ink';

/**
 * Fixed page header. The title and subtitle come from the nav model, so a route
 * cannot be called one thing in the sidebar and another thing here.
 *
 * The title is 30px Outfit at weight 500. It is deliberately not bold: at 64px
 * of header height the size alone carries the hierarchy, and a 700-weight title
 * at default tracking is the generic dashboard voice.
 */
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const active = findNavItem(pathname);
  const onSettings = pathname.startsWith('/settings');

  return (
    <header className="flex h-16 flex-none items-center justify-between gap-6 border-b border-hairline bg-transparent px-8">
      <div className="min-w-0">
        <h1 className="truncate font-display text-page-title font-medium text-ink">
          {active?.label ?? 'Sahayo'}
        </h1>
        <p className="truncate text-pill text-muted">
          {active?.subtitle ?? 'Cooperative gig services, run by its workers'}
        </p>
      </div>

      <div className="flex flex-none items-center gap-2">
        <LiveStatus className={CONTROL} />
        <HeaderSearch />

        <NotificationBell className={CONTROL} />

        <Link
          href="/settings"
          aria-current={onSettings ? 'page' : undefined}
          title="Settings"
          className={cn(CONTROL, 'w-9', onSettings && 'border-marigold bg-marigold-tint text-ink')}
        >
          <span className="sr-only">Settings</span>
          <Settings size={18} strokeWidth={1.5} aria-hidden />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className={`${CONTROL} gap-2 pl-1 pr-2.5`}>
            <Avatar name={CURRENT_ADMIN.name} src={CURRENT_ADMIN.avatarUrl} size={28} />
            <span className="hidden text-table font-medium text-ink lg:inline">
              {CURRENT_ADMIN.name}
            </span>
            <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
            <span className="sr-only">Open your account menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="px-2.5 py-2">
              <span className="block text-table font-medium text-ink">{CURRENT_ADMIN.name}</span>
              <span className="block text-pill font-normal text-muted">{CURRENT_ADMIN.role}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/account')}>
              <UserRound size={16} strokeWidth={1.5} aria-hidden className="text-muted" />
              Your account
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/account#preferences')}>
              <BellRing size={16} strokeWidth={1.5} aria-hidden className="text-muted" />
              Notification preferences
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/settings?tab=team')}>
              <Users size={16} strokeWidth={1.5} aria-hidden className="text-muted" />
              Team and roles
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/signed-out')}>
              <LogOut size={16} strokeWidth={1.5} aria-hidden className="text-muted" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
