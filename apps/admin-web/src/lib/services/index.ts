/**
 * The service layer. This is the only door between the UI and the data.
 *
 * THE RULE
 *
 *   A React component imports from `@/lib/services` and from nowhere else for
 *   data. It must never import `@/lib/store`, and it must never mutate state
 *   directly. `no-restricted-imports` in eslint.config.mjs enforces this, so a
 *   violation fails lint rather than depending on anyone remembering.
 *
 * WHY
 *
 *   This is the seam the real backend swaps into. When it arrives, a function's
 *   body changes from "filter this array" to "fetch this endpoint" and every page
 *   keeps working untouched. A component that read the store directly would be
 *   the one call site that has to be rewritten — and, worse, the one that
 *   silently stops updating when something else changes the data.
 *
 *   The other half of the rule is that mutating services write THROUGH the store.
 *   That is what makes `approveKyc(id)` change the badge in the Workers
 *   directory, the count on the verification queue, and the dashboard's
 *   verification stat at the same moment, because all three read derived state
 *   from the one store.
 *
 * CONVENTIONS
 *
 *   - Every function is async and awaits a 120–300ms delay, so loading states
 *     are real and visible. Mutations too: a button needs somewhere to put its
 *     pending state.
 *   - Reads return plain data. Writes return the updated record, so a caller can
 *     render the result without a second call.
 *   - Errors are thrown with a message that says what went wrong AND what to do
 *     next, because that message is what the user sees.
 */

export { settle, respond, serviceDelayMs } from './latency';

export {
  UNDER_ALLOCATED_THRESHOLD,
  assignZone,
  getMaxJobsThisWeek,
  getWorker,
  isUnderAllocated,
  listWorkers,
  setOnline,
  type WorkerFilter,
} from './workers.service';

export {
  getBooking,
  getBookingTimeline,
  listBookings,
  type BookingFilter,
} from './bookings.service';

export {
  appendEntries,
  getLedgerEntry,
  getReversalOf,
  getRevenueSeries,
  getSplitSummary,
  listLedger,
  type Granularity,
  type LedgerFilter,
  type Period,
  type RevenuePoint,
} from './ledger.service';

export {
  AADHAAR_REVEAL_WINDOW_MS,
  approveKyc,
  countPendingVerifications,
  listAadhaarAccessLog,
  listKycQueue,
  maskedAadhaar,
  rejectKyc,
  revealAadhaar,
  type AadhaarReveal,
  type KycFilter,
  type KycQueueItem,
} from './kyc.service';

export {
  OMBUDSMAN_ESCALATION_DAYS,
  canEscalate,
  countDisputesByOrigin,
  disputeAgeDays,
  escalateToOmbudsman,
  getDispute,
  getDisputeContext,
  listDisputes,
  postMessage,
  previewResolutionEntries,
  refundableAmount,
  resolveDispute,
  type DisputeContext,
  type DisputeFilter,
  type TimelineNode,
} from './disputes.service';

export {
  castVote,
  disburseLoan,
  getFundGrowth,
  getFundTotals,
  getProposal,
  hasQuorum,
  listLoanRequests,
  listProposals,
  provisionalOutcome,
  rejectLoan,
  type FundGrowthPoint,
} from './fund.service';

export {
  acceptSimulatedRequest,
  getBroadcast,
  getHeatmapGeoJSON,
  getLiveMap,
  getZoneDemand,
  rankingExplanation,
  reassignBooking,
  secondsSinceRequest,
  simulateRequest,
  type Broadcast,
  type HeatmapFeature,
  type HeatmapGeoJSON,
  type LiveMap,
  type MappedWorker,
  type RankedCandidate,
  type ZoneDemandPoint,
} from './dispatch.service';

export {
  categoryLabel,
  getCategoryMix,
  getHeadlineStats,
  getHiringByCategory,
  getJobsThisWeekByCategory,
  type CategoryJobCount,
  type CategorySlice,
  type HeadlineStats,
} from './analytics.service';

export {
  ActivityKind,
  listRecentActivity,
  type ActivityItem,
} from './activity.service';

export { getDashboardSummary, type DashboardSummary } from './dashboard.service';

export {
  getWorkerBookings,
  getWorkerDocuments,
  getWorkerEarnings,
  summariseEarnings,
  type WorkerEarning,
  type WorkerEarningsSummary,
} from './worker-profile.service';

export {
  issueReversal,
  listLedgerRows,
  listPayouts,
  previewSplit,
  releasePayouts,
  type LedgerRow,
  type LedgerRowStatus,
  type PayoutRow,
} from './finance.service';

export { listZones, resetDemoData } from './platform.service';
