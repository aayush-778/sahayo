import {
  dispatchSettingsSchema,
  platformDetailsSchema,
  revenueSplitSettingsSchema,
  type DispatchSettings,
  type Paise,
  type PlatformDetails,
  type PlatformSettings,
  type RevenueSplitSettings,
  type SettingsChange,
  type SettingsSection,
  type TeamMember,
} from '@sahayo/shared';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { DAY_MS, SEED_NOW, isCompletedBooking, splitAmount, type EquityWeights, type SplitShares } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond } from './latency';

/** The word an administrator types to confirm a change to the split. */
export const SPLIT_CONFIRMATION_WORD = 'CONFIRM';

/** How far back the split-change consequence looks, in days. */
export const SPLIT_IMPACT_WINDOW_DAYS = 30;

/*
 * Synchronous readers for other services.
 *
 * Services that split money or rank workers read the live settings through these
 * rather than constants.ts, so a confirmed change reaches every figure at once.
 */

/** The split as fractions, for splitAmount. */
export function currentSplitShares(): SplitShares {
  return sharesOf(adminState().settings.split);
}

/** The dispatch weights as fractions, for computeEquityScore. */
export function currentEquityWeights(): EquityWeights {
  const { weights } = adminState().settings.dispatch;
  return {
    proximity: weights.proximityPercent / 100,
    rating: weights.ratingPercent / 100,
    inverseAllocation: weights.inverseAllocationPercent / 100,
  };
}

export function currentDispatchSettings(): DispatchSettings {
  return adminState().settings.dispatch;
}

function sharesOf(split: RevenueSplitSettings): SplitShares {
  return {
    worker: split.workerPercent / 100,
    platform: split.platformPercent / 100,
    coopFund: split.fundPercent / 100,
  };
}

/* --- reads --------------------------------------------------------------- */

export async function getSettings(): Promise<PlatformSettings> {
  return respond(structuredClone(adminState().settings));
}

/** Every change made to the settings, most recent first. */
export async function listSettingsHistory(): Promise<SettingsChange[]> {
  return respond(adminState().settingsHistory);
}

export async function listTeam(): Promise<TeamMember[]> {
  return respond(adminState().team);
}

/* --- writes -------------------------------------------------------------- */

/** Turns the first zod issue into the sentence the form shows. */
function firstIssue(error: { issues: Array<{ message: string; path: (string | number)[] }> }): string {
  const issue = error.issues[0];
  return issue ? issue.message : 'Something in the form is not valid. Check each field and try again.';
}

function record(section: SettingsSection, summary: string, before: string, after: string): SettingsChange {
  const { settingsHistory } = adminState();
  return {
    id: `set_${String(settingsHistory.length + 1).padStart(4, '0')}`,
    section,
    summary,
    before,
    after,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    changedAt: SEED_NOW.toISOString(),
  };
}

const PLATFORM_LABELS: Record<keyof PlatformDetails, string> = {
  cooperativeName: 'Cooperative name',
  registrationNumber: 'Registration number',
  registeredOffice: 'Registered office',
  supportPhone: 'Support phone',
  supportEmail: 'Support email',
  serviceHoursStart: 'Bookings open',
  serviceHoursEnd: 'Bookings close',
};

const PLATFORM_MESSAGES: Partial<Record<keyof PlatformDetails, string>> = {
  supportPhone: 'Write the support phone as +91 followed by two groups of five digits, for example +91 61220 45800.',
  supportEmail: 'The support email is not a valid address. Check it for a missing @ or domain.',
  serviceHoursStart: 'Write the opening time as HH:MM on a 24-hour clock, for example 07:00.',
  serviceHoursEnd: 'Write the closing time as HH:MM on a 24-hour clock, for example 21:00.',
};

/** Saves the cooperative's registered details. */
export async function savePlatformDetails(details: PlatformDetails): Promise<PlatformSettings> {
  const parsed = platformDetailsSchema.safeParse(details);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0] as keyof PlatformDetails | undefined;
    throw new Error(
      (field && PLATFORM_MESSAGES[field]) ??
        `${field ? PLATFORM_LABELS[field] : 'A field'} needs at least three characters. Fill it in and save again.`,
    );
  }
  if (parsed.data.serviceHoursEnd <= parsed.data.serviceHoursStart) {
    throw new Error('Bookings must close after they open. Set a closing time later than the opening time.');
  }

  const state = adminState();
  const current = state.settings.platform;
  const changed = (Object.keys(PLATFORM_LABELS) as Array<keyof PlatformDetails>).filter(
    (key) => current[key] !== parsed.data[key],
  );
  if (changed.length === 0) {
    throw new Error('Nothing has changed since the last save. Edit a field first.');
  }

  state.applySettings(
    { ...state.settings, platform: parsed.data },
    record(
      'PLATFORM',
      `Updated ${changed.map((key) => PLATFORM_LABELS[key].toLowerCase()).join(', ')}`,
      changed.map((key) => `${PLATFORM_LABELS[key]}: ${current[key]}`).join('; '),
      changed.map((key) => `${PLATFORM_LABELS[key]}: ${parsed.data[key]}`).join('; '),
    ),
  );
  return respond(structuredClone(adminState().settings));
}

function describeDispatch(dispatch: DispatchSettings): string {
  const { weights } = dispatch;
  return (
    `${dispatch.broadcastRadiusKm} km radius, ${dispatch.pingTimeoutSeconds}s to accept, ` +
    `weights ${weights.proximityPercent} / ${weights.ratingPercent} / ${weights.inverseAllocationPercent}`
  );
}

/** Saves the dispatch rules. The weights must sum to 100. */
export async function saveDispatchSettings(dispatch: DispatchSettings): Promise<PlatformSettings> {
  const parsed = dispatchSettingsSchema.safeParse(dispatch);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));

  const state = adminState();
  const before = describeDispatch(state.settings.dispatch);
  const after = describeDispatch(parsed.data);
  if (before === after) {
    throw new Error('The dispatch rules are already set this way. Move a slider first.');
  }

  state.applySettings(
    { ...state.settings, dispatch: parsed.data },
    record('DISPATCH', 'Changed the dispatch rules', before, after),
  );
  return respond(structuredClone(adminState().settings));
}

/** What a change to the split would have meant, in rupees, over the last month. */
export interface SplitChangeImpact {
  current: RevenueSplitSettings;
  proposed: RevenueSplitSettings;
  /** Completed bookings in the last SPLIT_IMPACT_WINDOW_DAYS. */
  bookingCount: number;
  /** Their average gross, which the sentence uses as "an average booking". */
  averageGross: Paise;
  onAverage: {
    current: { worker: Paise; platform: Paise; coopFund: Paise };
    proposed: { worker: Paise; platform: Paise; coopFund: Paise };
  };
  /** Signed: what each party would have received more (+) or less (−) last month. */
  monthDelta: { worker: Paise; platform: Paise; coopFund: Paise };
}

/**
 * Computes the consequence of a proposed split before anything is saved.
 *
 * Re-splits each of last month's completed bookings with both the current and the
 * proposed shares, using the same splitAmount the ledger posts with, so the rupee
 * figures in the confirmation are exact rather than a percentage of a total.
 */
export async function previewSplitChange(proposed: RevenueSplitSettings): Promise<SplitChangeImpact> {
  const parsed = revenueSplitSettingsSchema.safeParse(proposed);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));

  const { bookings, settings } = adminState();
  const since = new Date(SEED_NOW.getTime() - SPLIT_IMPACT_WINDOW_DAYS * DAY_MS).toISOString();
  const recent = bookings.filter(
    (booking) => isCompletedBooking(booking) && (booking.completedAt ?? booking.createdAt) >= since,
  );

  const currentShares = sharesOf(settings.split);
  const proposedShares = sharesOf(parsed.data);
  const monthDelta = { worker: 0, platform: 0, coopFund: 0 };
  let gross = 0;
  for (const booking of recent) {
    gross += booking.amount;
    const before = splitAmount(booking.amount, currentShares);
    const after = splitAmount(booking.amount, proposedShares);
    monthDelta.worker += after.worker - before.worker;
    monthDelta.platform += after.platform - before.platform;
    monthDelta.coopFund += after.coopFund - before.coopFund;
  }

  /* Rounded to a whole rupee so the sentence quotes a booking someone could make. */
  const averageGross = recent.length ? Math.round(gross / recent.length / 100) * 100 : 0;

  return respond({
    current: settings.split,
    proposed: parsed.data,
    bookingCount: recent.length,
    averageGross,
    onAverage: {
      current: splitAmount(averageGross, currentShares),
      proposed: splitAmount(averageGross, proposedShares),
    },
    monthDelta,
  });
}

function describeSplit(split: RevenueSplitSettings): string {
  return `Worker ${split.workerPercent}%, platform ${split.platformPercent}%, fund ${split.fundPercent}%`;
}

/**
 * Changes the split, for bookings paid from now on.
 *
 * Refuses unless `confirmation` is exactly the confirmation word. Nothing already in
 * the ledger is re-split: those bookings were paid at the old shares and their rows
 * stay exactly as they are.
 */
export async function applySplitChange(
  proposed: RevenueSplitSettings,
  confirmation: string,
): Promise<PlatformSettings> {
  if (confirmation !== SPLIT_CONFIRMATION_WORD) {
    throw new Error(`Type ${SPLIT_CONFIRMATION_WORD} in capitals to change the split. Nothing has been saved.`);
  }
  const parsed = revenueSplitSettingsSchema.safeParse(proposed);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));

  const state = adminState();
  const before = describeSplit(state.settings.split);
  const after = describeSplit(parsed.data);
  if (before === after) {
    throw new Error('The split is already set to these shares. Nothing has been saved.');
  }

  state.applySettings(
    { ...state.settings, split: parsed.data },
    record('PAYMENTS', 'Changed the revenue split for new bookings', before, after),
  );
  return respond(structuredClone(adminState().settings));
}
