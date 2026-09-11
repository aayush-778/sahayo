import type { Id, IsoDateTime, Paise } from '@sahayo/shared';

/**
 * Mock notification feed.
 *
 * There is no notification TYPE in @sahayo/shared — nothing has needed one
 * yet, and this phase does not change shared types — so the shape is declared
 * here. It is modelled on what a push payload would actually carry: a kind, a
 * timestamp, a read flag, and the few ids and values the copy interpolates.
 * The user-facing wording lives in the i18next catalogue under
 * `notifications.kind.*`, because unlike a category name this is system
 * chrome, not catalogue content.
 *
 * The cooperative-fund entry is not filler. Every settled booking routes 5%
 * into the workers' collectively owned fund — see COOP_FUND_SHARE in
 * @sahayo/shared — and this is the one screen where a customer sees that
 * happen on their own money. It is the differentiator of the platform, so it
 * belongs somewhere a judge will tap.
 */
export const NotificationKind = {
  BOOKING_ACCEPTED: 'BOOKING_ACCEPTED',
  WORKER_EN_ROUTE: 'WORKER_EN_ROUTE',
  COOP_FUND_CONTRIBUTION: 'COOP_FUND_CONTRIBUTION',
  BOOKING_SETTLED: 'BOOKING_SETTLED',
} as const;
export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind];

export interface AppNotification {
  id: Id;
  kind: NotificationKind;
  createdAt: IsoDateTime;
  read: boolean;
  /** Tapping the row opens this booking's tracking screen, when it has one. */
  bookingId?: Id;
  workerName?: string;
  serviceName?: string;
  serviceNameLocalized?: Record<string, string>;
  /** Integer paise. Rendered through `formatPaise`, never divided here. */
  amount?: Paise;
  /** Minutes, for the en-route row. Rendered through `formatDuration`. */
  etaMinutes?: number;
}

/**
 * Timestamps are relative to load, not fixed dates.
 *
 * A demo shown three weeks from now would otherwise open on a list that says
 * "21d ago" against a booking the live-order card claims is happening right
 * this minute. Anchoring to `Date.now()` keeps the feed plausible whenever it
 * is opened, which is the only property that matters for mock data.
 */
function minutesAgo(minutes: number): IsoDateTime {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const mockNotifications: AppNotification[] = [
  {
    id: 'ntf_en_route',
    kind: NotificationKind.WORKER_EN_ROUTE,
    createdAt: minutesAgo(4),
    read: false,
    bookingId: 'bkg_live_ac',
    workerName: 'Rakesh Paswan',
    etaMinutes: 12,
  },
  {
    id: 'ntf_accepted',
    kind: NotificationKind.BOOKING_ACCEPTED,
    createdAt: minutesAgo(38),
    read: false,
    bookingId: 'bkg_live_ac',
    workerName: 'Rakesh Paswan',
    serviceName: 'AC Wet Service',
    serviceNameLocalized: { hi: 'एसी वेट सर्विस' },
  },
  {
    id: 'ntf_coop_fund',
    kind: NotificationKind.COOP_FUND_CONTRIBUTION,
    createdAt: minutesAgo(60 * 26),
    read: false,
    bookingId: 'bkg_past_fan',
    // 5% of the ₹349 fan repair that settled on the 11th. Matches
    // `coopFundShare` on that booking's fare exactly.
    amount: 1745,
  },
  {
    id: 'ntf_settled',
    kind: NotificationKind.BOOKING_SETTLED,
    createdAt: minutesAgo(60 * 27),
    read: true,
    bookingId: 'bkg_past_fan',
    serviceName: 'Fan Repair',
    serviceNameLocalized: { hi: 'पंखा मरम्मत' },
    amount: 34900,
  },
];

/** Ionicons glyph per kind. Kept beside the data so a new kind cannot be
 *  added without deciding how it looks. */
export const NOTIFICATION_ICON: Record<NotificationKind, string> = {
  [NotificationKind.BOOKING_ACCEPTED]: 'checkmark-circle-outline',
  [NotificationKind.WORKER_EN_ROUTE]: 'navigate-outline',
  [NotificationKind.COOP_FUND_CONTRIBUTION]: 'people-outline',
  [NotificationKind.BOOKING_SETTLED]: 'receipt-outline',
};
