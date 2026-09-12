import {
  BadgeCheck,
  CalendarCheck,
  Gauge,
  HandCoins,
  type LucideIcon,
  MessageSquareWarning,
  Radio,
  Settings,
  TrendingUp,
  Users,
  UserRound,
  Wallet,
} from 'lucide-react';

/**
 * The navigation model, and the only place a route's title and subtitle are
 * written down. The sidebar renders it, and the header reads the active entry
 * to title the page — so a route can never show one name in two places.
 */
export interface NavItem {
  href: string;
  label: string;
  /** The one-line orientation shown under the page title in the header. */
  subtitle: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /**
   * Never rendered as visible text. Tracked-out uppercase eyebrow labels over a
   * nav group are the most recognisable generated-UI tell, so the sidebar shows
   * the grouping through spacing and a hairline rule instead. This name survives
   * only as the group's accessible label, so screen-reader users still hear the
   * structure that sighted users read from the layout.
   */
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Menu',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        subtitle: 'How the cooperative is doing today',
        icon: Gauge,
      },
      {
        href: '/dispatch',
        label: 'Live Dispatch',
        subtitle: 'Open requests, available workers, and who was offered what',
        icon: Radio,
      },
      {
        href: '/bookings',
        label: 'Bookings',
        subtitle: 'Every job, from request through to payment',
        icon: CalendarCheck,
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        href: '/workers',
        label: 'Workers',
        subtitle: 'The 140 members who own this platform',
        icon: Users,
      },
      {
        href: '/customers',
        label: 'Customers',
        subtitle: 'Households and businesses booking work',
        icon: UserRound,
      },
      {
        href: '/verification',
        label: 'Verification',
        subtitle: 'Documents waiting to be checked',
        icon: BadgeCheck,
      },
    ],
  },
  {
    label: 'Money',
    items: [
      {
        href: '/finance',
        label: 'Finance',
        subtitle: 'Where every rupee went, and the ledger that proves it',
        icon: Wallet,
      },
      {
        href: '/fund',
        label: 'Cooperative Fund',
        subtitle: 'What the 5% has paid for, and what workers voted on',
        icon: HandCoins,
      },
    ],
  },
  {
    label: 'Insight',
    items: [
      {
        href: '/analytics',
        label: 'Analytics',
        subtitle: 'Demand, categories, and how work is shared out',
        icon: TrendingUp,
      },
      {
        href: '/disputes',
        label: 'Disputes',
        subtitle: 'Raised by customers and by workers alike',
        icon: MessageSquareWarning,
      },
      {
        href: '/settings',
        label: 'Settings',
        subtitle: 'Dispatch rules, the payment split, and compliance exports',
        icon: Settings,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/**
 * Resolves the nav entry a pathname belongs to. Matches on prefix so detail
 * routes such as /workers/<uuid> keep the Workers item active and keep the
 * Workers title in the header.
 */
export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
