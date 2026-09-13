'use client';

import { Bell } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { listNotifications, markNotificationsRead, type NotificationFeed } from '@/lib/services';
import { cn } from '@/lib/utils';

const TONE_DOT: Record<string, string> = {
  coral: 'bg-coral',
  marigold: 'bg-marigold',
  lavender: 'bg-lavender',
};

/**
 * The notification bell: what needs attention across the portal.
 *
 * Re-read on every page change and whenever the menu opens, so a queue cleared on one
 * page stops being announced on the next. Opening an alert marks it read and goes to
 * the page that holds the work; the unread dot shows only while something is unread.
 */
export function NotificationBell({ className }: { className: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [feed, setFeed] = useState<NotificationFeed>();

  const load = useCallback(async () => {
    setFeed(await listNotifications());
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const unread = feed?.unread ?? 0;

  return (
    <DropdownMenu onOpenChange={(open) => (open ? void load() : undefined)}>
      <DropdownMenuTrigger className={cn(className, 'relative w-9')}>
        <span className="sr-only">{unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}</span>
        <Bell size={18} strokeWidth={1.5} aria-hidden />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-coral ring-2 ring-surface"
          />
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[24rem] p-1.5">
        <div className="flex items-baseline justify-between px-2.5 pb-1.5 pt-1">
          <p className="font-display text-body font-medium text-ink">Needs attention</p>
          <p className="text-pill text-muted">{unread > 0 ? `${unread} unread` : 'All read'}</p>
        </div>

        {!feed ? (
          <p className="px-2.5 py-3 text-table text-muted">Checking the queues</p>
        ) : feed.items.length === 0 ? (
          <p className="px-2.5 py-3 text-table text-muted">
            Nothing needs attention. Every queue is clear, or its alerts are switched off in your account.
          </p>
        ) : (
          <div className="scroll-hidden max-h-[60vh] overflow-y-auto">
            {feed.items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onSelect={() => {
                  void markNotificationsRead([item.id]).then(load);
                  router.push(item.href);
                }}
                className="items-start gap-3 py-2.5"
              >
                <span
                  aria-hidden
                  className={cn('mt-1.5 h-2 w-2 flex-none rounded-full', item.read ? 'bg-hairline' : TONE_DOT[item.tone])}
                />
                <span className="min-w-0">
                  <span className={cn('block text-table', item.read ? 'text-muted' : 'text-ink')}>
                    {item.title}
                    {item.read ? null : <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="block text-pill text-muted">{item.detail}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
          <DropdownMenuItem
            disabled={unread === 0}
            onSelect={(event) => {
              event.preventDefault();
              if (feed) void markNotificationsRead(feed.items.map((item) => item.id)).then(load);
            }}
            className="text-pill"
          >
            Mark all as read
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push('/account#preferences')} className="text-pill text-muted">
            Choose which alerts show
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
