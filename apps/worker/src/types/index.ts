import type { Booking, Id, IsoDateTime, Paise, User } from '@sahayo/shared';

/**
 * Worker-app domain types that @sahayo/shared does not define.
 *
 * Shared carries the contract the backend will speak — bookings, users, worker
 * profiles, ledger entries. What it has no type for yet is the worker's side of
 * the product: an incoming job offer, a cooperative proposal, a chat thread, a
 * customer's review. Those live here until Phase 5 gives them a wire format,
 * and wherever they contain a shared record they embed the shared type rather
 * than restating its fields.
 */

/**
 * A string in both languages the app ships.
 *
 * For CONTENT — a proposal's title, the cooperative's name — which a real
 * backend would serve per locale. Interface copy lives in the i18n catalogue.
 */
export interface Localized {
  en: string;
  hi: string;
}

export type Gender = 'male' | 'female' | 'other' | 'undisclosed';

/**
 * The three proofs uploaded at step 3, as the design lays them out: one
 * government ID, an address proof, and a recent photo.
 */
export const DOCUMENT_KINDS = ['idProof', 'addressProof', 'photo'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** The government IDs accepted as `idProof` — any one of them. */
export const ID_PROOF_TYPES = ['aadhaar', 'pan', 'drivingLicense'] as const;
export type IdProofType = (typeof ID_PROOF_TYPES)[number];

export type DocumentStatus = 'missing' | 'uploaded' | 'verified' | 'rejected';

export type DocumentMimeType = 'image/jpeg' | 'image/png' | 'application/pdf';

/** What is known about an uploaded file. The bytes themselves go to storage in Phase 5. */
export interface UploadedFile {
  name: string;
  sizeBytes: number;
  mimeType: DocumentMimeType;
  uploadedAt: IsoDateTime;
}

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** A working window in 24-hour local time, `HH:MM`. */
export interface WorkingHours {
  start: string;
  end: string;
}

/**
 * All three are required. The ID can be any of ID_PROOF_TYPES, so a worker
 * without a PAN card — common in the informal sector — is never blocked.
 */
export const REQUIRED_DOCUMENTS: readonly DocumentKind[] = DOCUMENT_KINDS;

/**
 * A job offered to this worker.
 *
 * It is a `Booking` in BROADCAST, exactly as the state machine in shared
 * describes — REQUESTED → BROADCAST → ACCEPTED — joined to the customer who
 * placed it, so the offer card never has to look anything up.
 */
export interface JobRequest {
  id: Id;
  booking: Booking;
  customer: User;
  /** Straight-line metres from the worker. Never rendered raw. */
  distanceM: number;
  /** How long the job usually takes, as the dispatcher quotes it. */
  estimatedMinutes: number;
  /**
   * When the offer runs out, on THIS phone's clock. A live offer's server deadline is
   * converted on arrival — see realtime/mappers.ts — so the countdown is right even when
   * the phone's clock is not.
   */
  expiresAt: IsoDateTime;
  /** 'live' for an offer from the dispatcher; absent for the offline demo dispatcher's. */
  source?: 'live';
  /**
   * Booked ahead: no countdown, answered from the Scheduled requests list, and open
   * until the slot rather than for thirty seconds. Absent on an instant offer.
   */
  scheduled?: true;
}

/**
 * Why a worker turned an offer down — a short fixed list, so Phase 5 dispatch
 * can act on it (widen the radius, raise the floor fare, stop offering a
 * sub-category) instead of reading free text.
 */
export const DECLINE_REASONS = ['too_far', 'rate_too_low', 'already_busy', 'wrong_service'] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export interface DeclineRecord {
  requestId: Id;
  bookingId: Id;
  reason: DeclineReason;
  declinedAt: IsoDateTime;
  /** What was offered, kept so the Cancelled tab can still show it after it leaves the feed. */
  request: JobRequest;
}

/**
 * The Bookings tabs.
 *
 *   pending    offers waiting for this worker's answer
 *   ongoing    accepted work not yet finished — ACCEPTED to IN_PROGRESS
 *   completed  COMPLETED and SETTLED
 *   cancelled  cancelled or expired bookings, and offers this worker rejected
 */
export type BookingTab = 'all' | 'pending' | 'ongoing' | 'completed' | 'cancelled';

/** When each status was reached, for elapsed time and job duration. */
export type JobTimeline = Partial<Record<Booking['status'], IsoDateTime>>;

/**
 * Problems a worker can flag about a customer. A fixed list, so the
 * cooperative can count them — a customer flagged twice for not paying is a
 * pattern, and free text would hide it.
 */
export const CUSTOMER_FLAGS = ['abusive', 'non_payment', 'unsafe', 'misleading'] as const;
export type CustomerFlag = (typeof CUSTOMER_FLAGS)[number];

/** The worker's rating of a customer — the direction most platforms leave out. */
export interface CustomerRating {
  id: Id;
  bookingId: Id;
  customerId: Id;
  stars: 1 | 2 | 3 | 4 | 5;
  flags: CustomerFlag[];
  /** Worker-written, shown as written. */
  comment: string;
  createdAt: IsoDateTime;
}

/** Earnings paid out to the worker's account in one transfer. */
export interface Settlement {
  id: Id;
  amount: Paise;
  /** The WORKER_PAYOUT ledger entries this transfer covered. */
  entryIds: Id[];
  settledAt: IsoDateTime;
  /** The UTR a bank would print — what a worker quotes when chasing money. */
  reference: string;
  method: 'upi' | 'bank';
}

export type VoteChoice = 'yes' | 'no' | 'abstain';
export type ProposalStatus = 'active' | 'passed' | 'rejected';

/** What a proposal is for. Decides its icon, nothing else. */
export type ProposalCategory = 'health' | 'loan' | 'training' | 'relief' | 'equipment' | 'other';

export interface VoteTally {
  yes: number;
  no: number;
  abstain: number;
}

/** A request to spend from the cooperative fund, decided by member vote. */
export interface Proposal {
  id: Id;
  title: Localized;
  summary: Localized;
  amount: Paise;
  /** A member's name — a proposal is raised by a person, not by the platform. */
  proposedBy: string;
  status: ProposalStatus;
  opensAt: IsoDateTime;
  closesAt: IsoDateTime;
  /** Votes cast by OTHER members. This worker's own vote is session state. */
  tally: VoteTally;
  eligibleVoters: number;
  category: ProposalCategory;
  /** The plain facts a member weighs: who benefits, how much each, how it is paid. */
  points: Localized[];
  /** For a closed proposal: what actually happened. */
  outcome?: Localized;
}

/** The Earnings screen's period chips. */
export type EarningsPeriod = 'this_month' | 'last_month' | 'three_months';

/** Help a member can ask the fund for. */
export type SupportKind = 'loan' | 'claim';

export const LOAN_PURPOSES = ['tools', 'repair', 'vehicle', 'other'] as const;
export type LoanPurpose = (typeof LOAN_PURPOSES)[number];

export const CLAIM_TYPES = ['accident', 'illness', 'tools_lost', 'disaster'] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export type SupportStatus = 'submitted' | 'under_review' | 'approved' | 'repaying' | 'paid' | 'declined' | 'closed';

/** A tool loan or an emergency claim this worker has asked the fund for. */
export interface SupportRequest {
  id: Id;
  kind: SupportKind;
  amount: Paise;
  purpose: LoanPurpose | ClaimType;
  /** Worker-written, shown as written. */
  details: string;
  /** Loans only. */
  repaymentMonths?: number;
  /** Loans only: how much has come back to the pool. */
  repaidPaise?: number;
  status: SupportStatus;
  /** The coordinator's note — content from the cooperative, so stored in both languages. */
  note?: Localized;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * One-tap messages for a worker who types slowly on a phone keyboard. The text
 * comes from the i18n catalogue in the worker's language when sent.
 */
export const QUICK_REPLIES = ['on_my_way', 'reached', 'late_10', 'call_you', 'send_photo', 'work_done'] as const;
export type QuickReplyKey = (typeof QUICK_REPLIES)[number];

export interface ChatMessage {
  id: Id;
  from: 'worker' | 'customer';
  /** User-written, shown as written — never translated. */
  text: string;
  sentAt: IsoDateTime;
  /** Set when the worker sent it as a quick reply. */
  quickReply?: QuickReplyKey;
}

export interface ChatThread {
  id: Id;
  bookingId: Id;
  customerId: Id;
  messages: ChatMessage[];
}

export interface Rating {
  id: Id;
  bookingId: Id;
  customerId: Id;
  stars: 1 | 2 | 3 | 4 | 5;
  /** User-written, shown as written. */
  comment: string;
  createdAt: IsoDateTime;
}
