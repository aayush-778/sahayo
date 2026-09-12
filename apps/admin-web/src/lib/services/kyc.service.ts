import {
  type KycDocumentType,
  KycStatus,
  type AadhaarAccessLogEntry,
  type AadhaarAccessPurpose,
  type KycRejectionReason,
  type KycSubmission,
} from '@sahayo/shared';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { SEED_NOW } from '@/lib/seed';
import { adminState } from '@/lib/store';
import { respond, settle } from './latency';

/** How long a revealed Aadhaar stays on screen before it is cleared. */
export const AADHAAR_REVEAL_WINDOW_MS = 30_000;

export interface KycFilter {
  status?: KycStatus;
  documentType?: KycDocumentType;
  search?: string;
}

/** A queue row: the submission joined to the worker it belongs to. */
export interface KycQueueItem {
  submission: KycSubmission;
  workerId: string;
  workerName: string;
  workerAvatarUrl: string;
  workerCategory: string;
  status: KycStatus;
}

export async function listKycQueue(filter: KycFilter = {}): Promise<KycQueueItem[]> {
  const { kycQueue, workers } = adminState();
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  const needle = filter.search?.trim().toLowerCase();

  const items = kycQueue.flatMap<KycQueueItem>((submission) => {
    const worker = workerById.get(submission.workerId);
    if (!worker) return [];
    if (filter.status && worker.kycStatus !== filter.status) return [];
    if (filter.documentType && submission.documentType !== filter.documentType) return [];
    if (needle && !worker.name.toLowerCase().includes(needle)) return [];

    return [
      {
        submission,
        workerId: worker.id,
        workerName: worker.name,
        workerAvatarUrl: worker.avatarUrl,
        workerCategory: worker.category,
        status: worker.kycStatus,
      },
    ];
  });

  /* Oldest submission first: a review queue is worked front to back. */
  return respond(
    items.sort((a, b) => a.submission.submittedAt.localeCompare(b.submission.submittedAt)),
  );
}

/**
 * Approves a submission and verifies the worker.
 *
 * IDEMPOTENT. Calling it twice does not throw and does not double-apply: the
 * second call sees the worker already verified and returns the same submission.
 * A review queue is worked fast, under a double-click, and an approval that threw
 * on the second press would look like a failure on a job that had already
 * succeeded.
 *
 * Writing through the store is what makes one call update three screens at once —
 * the worker's badge in the directory, this queue's count, and the dashboard's
 * verification stat all read the same state.
 */
export async function approveKyc(submissionId: string): Promise<KycSubmission> {
  const state = adminState();
  const submission = state.kycQueue.find((candidate) => candidate.id === submissionId);
  if (!submission) throw new Error(`No KYC submission with id ${submissionId}`);

  const worker = state.workers.find((candidate) => candidate.id === submission.workerId);
  if (worker && worker.kycStatus === KycStatus.VERIFIED) {
    return respond(submission);
  }

  state.setWorkerKycStatus(submission.workerId, KycStatus.VERIFIED);
  state.reviewKycSubmission(submissionId, {
    reviewedAt: SEED_NOW.toISOString(),
    reviewedByAdminId: CURRENT_ADMIN.id,
    /* An approval clears any earlier rejection, so the record is not contradictory. */
    rejectionReason: undefined,
    rejectionNote: undefined,
  });

  const updated = adminState().kycQueue.find((candidate) => candidate.id === submissionId);
  return respond(updated as KycSubmission);
}

/**
 * Rejects a submission with a reason.
 *
 * The reason is required because it is what the worker's app receives — a
 * rejection with no reason leaves someone unable to work and unable to find out
 * why. Idempotent in the same way as `approveKyc`.
 */
export async function rejectKyc(
  submissionId: string,
  reason: KycRejectionReason,
  note?: string,
): Promise<KycSubmission> {
  const state = adminState();
  const submission = state.kycQueue.find((candidate) => candidate.id === submissionId);
  if (!submission) throw new Error(`No KYC submission with id ${submissionId}`);

  const worker = state.workers.find((candidate) => candidate.id === submission.workerId);
  if (worker && worker.kycStatus === KycStatus.REJECTED && submission.rejectionReason === reason) {
    return respond(submission);
  }

  state.setWorkerKycStatus(submission.workerId, KycStatus.REJECTED);
  state.reviewKycSubmission(submissionId, {
    reviewedAt: SEED_NOW.toISOString(),
    reviewedByAdminId: CURRENT_ADMIN.id,
    rejectionReason: reason,
    ...(note ? { rejectionNote: note } : {}),
  });

  const updated = adminState().kycQueue.find((candidate) => candidate.id === submissionId);
  return respond(updated as KycSubmission);
}

/** The masked form. The default and the only persistent representation. */
export function maskedAadhaar(last4: string | undefined): string {
  return `XXXX-XXXX-${last4 ?? 'XXXX'}`;
}

export interface AadhaarReveal {
  /**
   * The full value, for display only.
   *
   * The caller must render it and drop it when the window expires. It must never
   * be written to React state that outlives that window, to the Zustand store, to
   * localStorage, sessionStorage or IndexedDB, to a URL, or to a log.
   */
  value: string;
  /** How long the caller may show it, in milliseconds. */
  windowMs: number;
  /** The audit row written before this value was produced. */
  auditEntry: AadhaarAccessLogEntry;
}

/**
 * Reveals a full Aadhaar number, briefly and on the record.
 *
 * UIDAI Circular 14 of 2025. The order of operations here is the compliance
 * requirement, not a style choice:
 *
 *   1. A purpose is required. Without one there is no lawful basis to look.
 *   2. The audit row is written FIRST, before any value is produced. A reveal
 *      that cannot be logged does not happen — that is why the log write is not
 *      after the return value is computed.
 *   3. The value is returned for display only, with a window. The caller shows a
 *      countdown and clears it; nothing persists it.
 *
 * In production the value would come from a UIDAI-authorised lookup against the
 * reference key, server-side, and would never reach this process. Here it is
 * derived from the stored last four digits so the masked and revealed forms agree,
 * and the leading eight digits are placeholder zeros rather than a plausible
 * number — there is no real Aadhaar in this codebase to reveal.
 */
export async function revealAadhaar(
  submissionId: string,
  purpose: AadhaarAccessPurpose,
): Promise<AadhaarReveal> {
  const state = adminState();
  const submission = state.kycQueue.find((candidate) => candidate.id === submissionId);
  if (!submission) throw new Error(`No KYC submission with id ${submissionId}`);
  if (!submission.aadhaarRef) {
    throw new Error('This submission is not an Aadhaar document, so there is nothing to reveal.');
  }

  const auditEntry: AadhaarAccessLogEntry = {
    id: `aal_${submissionId}_${state.aadhaarAccessLog.length + 1}`,
    submissionId,
    workerId: submission.workerId,
    adminId: CURRENT_ADMIN.id,
    adminName: CURRENT_ADMIN.name,
    purpose,
    accessedAt: SEED_NOW.toISOString(),
  };

  /* Logged first. The value below does not exist until this has been recorded. */
  state.appendAadhaarAccess(auditEntry);

  await settle();

  return {
    value: `0000-0000-${submission.aadhaarLast4 ?? 'XXXX'}`,
    windowMs: AADHAAR_REVEAL_WINDOW_MS,
    auditEntry,
  };
}

/**
 * The access log, newest first.
 *
 * Append-only. There is no function here that edits or removes an entry, and
 * there must never be one — this log is the auditability proof an evaluator asks
 * for, and a log that can be edited proves nothing.
 */
export async function listAadhaarAccessLog(): Promise<AadhaarAccessLogEntry[]> {
  const { aadhaarAccessLog } = adminState();
  return respond(aadhaarAccessLog);
}

/** Count of submissions still awaiting a decision, for the dashboard and sidebar. */
export async function countPendingVerifications(): Promise<number> {
  const { workers } = adminState();
  return respond(workers.filter((worker) => worker.kycStatus === KycStatus.PENDING).length);
}
