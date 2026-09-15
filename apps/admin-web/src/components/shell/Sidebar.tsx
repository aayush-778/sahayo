'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV_GROUPS } from '@/lib/nav/routes';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { Avatar } from '@/components/ui-kit/Avatar';

/**
 * Fixed-width navigation rail. It never scrolls with the page and it never
 * collapses — the portal is a desk tool on a 1280-wide projector, not a
 * responsive marketing site.
 *
 * The rail is transparent and sits on the same cream canvas as the header and
 * main, divided from them by a single hairline. It must not get a white panel.
 *
 * The four groups carry no visible label. A tracked-out uppercase eyebrow over a
 * nav group is the most recognisable generated-UI signature there is, and the
 * icons and ordering already carry the structure. A hairline rule and 20px of
 * space separate the groups instead. Each group keeps its name as an accessible
 * label only, so screen readers still hear the grouping that sighted users read
 * from the spacing.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-10 flex h-full w-64 flex-none flex-col border-r border-hairline bg-transparent">
      <div className="flex h-16 flex-none items-center gap-2.5 px-4">
        {/*
         * The wordmark glyph: a marigold diamond, drawn as a rotated square so
         * it needs no asset and stays crisp at any zoom.
         */}
        <span aria-hidden className="h-3.5 w-3.5 rotate-45 rounded-[2px] bg-marigold" />
        <span className="font-display text-card-title font-medium text-ink">Sahayo</span>
      </div>

      <nav aria-label="Main" className="scroll-hidden flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, groupIndex) => (
          <ul
            key={group.label}
            aria-label={group.label}
            className={cn(
              'flex flex-col gap-0.5',
              groupIndex > 0 && 'mt-5 border-t border-hairline pt-5',
            )}
          >
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex h-nav items-center gap-2.5 rounded-pill px-3 text-body font-medium transition-colors',
                      isActive
                        ? 'bg-marigold-tint text-ink'
                        : 'text-muted hover:bg-marigold-tint/40 hover:text-ink',
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.5}
                      aria-hidden
                      className={isActive ? 'text-marigold' : 'text-muted'}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>

      <div className="flex flex-none items-center gap-3 border-t border-hairline px-4 py-3.5">
        <Avatar name={CURRENT_ADMIN.name} src={CURRENT_ADMIN.avatarUrl} size={32} />
        <div className="min-w-0">
          <p className="truncate text-table font-medium text-ink">{CURRENT_ADMIN.name}</p>
          <p className="truncate text-pill text-muted">{CURRENT_ADMIN.role}</p>
        </div>
      </div>
    </aside>
  );
}
