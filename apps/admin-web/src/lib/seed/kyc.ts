import {
  KycDocumentType,
  KycStatus,
  type AdminWorker,
  type KycSubmission,
} from '@sahayo/shared';
import { SEEDS, createRng, isoAgo } from './rng';

export const KYC_QUEUE_SIZE = 35;

/**
 * Placeholder document scans.
 *
 * Generic document-shaped images rather than anything resembling a real identity
 * document: a seed that shipped a realistic-looking Aadhaar card would be a
 * liability even as a placeholder. The reviewer's zoom and rotate controls work
 * the same on these.
 */
const DOCUMENT_IMAGES = [
  'https://placehold.co/1200x760/FEF3D4/1F1B16?text=Document+scan+1',
  'https://placehold.co/1200x760/FEF3D4/1F1B16?text=Document+scan+2',
  'https://placehold.co/1200x760/FEF3D4/1F1B16?text=Document+scan+3',
  'https://placehold.co/1200x760/FEF3D4/1F1B16?text=Document+scan+4',
] as const;

/**
 * An opaque handle standing in for an Aadhaar number.
 *
 * UIDAI Circular 14 of 2025, and the reason this function exists rather than a
 * number field:
 *
 *   There is NO raw 12-digit Aadhaar number anywhere in this codebase. Not in a
 *   type, not in this seed, not in the Zustand store, not in React state, not in
 *   a URL, not in a log, not in localStorage. This reference is an opaque key
 *   that an authorised reveal exchanges for a value shown briefly and never
 *   persisted. The only Aadhaar-shaped string in the product is the masked
 *   display form XXXX-XXXX-4567.
 *
 *   Hashing an Aadhaar number is also banned. A 12-digit space is small enough
 *   to enumerate completely, so a hash of an Aadhaar IS the Aadhaar. Routes use
 *   UUIDs and nothing Aadhaar-derived.
 *
 * The `aref_` prefix is enforced by `kycSubmissionSchema`, which also rejects a
 * 12-digit value outright — a last line of defence if a future integration ever
 * tries to put a real number here.
 */
function aadhaarReference(rng: ReturnType<typeof createRng>): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = 'aref_';
  for (let i = 0; i < 20; i += 1) out += alphabet[rng.int(0, alphabet.length - 1)];
  return out;
}

/**
 * The verification queue: 35 submissions awaiting review.
 *
 * Drawn from workers whose KYC status is actually PENDING, so approving one in
 * the Phase 6 queue changes that worker's badge in the directory and the
 * verification count on the dashboard. A queue of submissions belonging to
 * already-verified workers would make the whole service layer look like it works
 * when it does not.
 */
export function buildKycQueue(workers: AdminWorker[]): KycSubmission[] {
  const rng = createRng(SEEDS.kyc);

  const pending = workers.filter((worker) => worker.kycStatus === KycStatus.PENDING);
  /*
   * Top up from unsubmitted workers if the pending cohort is short of the queue
   * size. The seed's KYC weights make 35 likely but not guaranteed, and a queue
   * that silently shrinks would make the demo's "35 waiting" line wrong.
   */
  const topUp = workers.filter((worker) => worker.kycStatus === KycStatus.UNSUBMITTED);
  const subjects = [...pending, ...topUp].slice(0, KYC_QUEUE_SIZE);

  /*
   * Fail loudly rather than returning a short queue. The seed is deterministic,
   * so this either always passes or always fails — and a silently shrinking queue
   * would quietly make the demo's "35 waiting" line wrong. If this throws, raise
   * the PENDING weight in workers.ts.
   */
  if (subjects.length < KYC_QUEUE_SIZE) {
    throw new Error(
      `KYC queue needs ${KYC_QUEUE_SIZE} submissions but only ${subjects.length} workers ` +
        'are pending or unsubmitted. Raise the PENDING weight in KYC_WEIGHTS.',
    );
  }

  return subjects.map((worker) => {
    const documentType = rng.weighted(
      [KycDocumentType.AADHAAR, KycDocumentType.PAN, KycDocumentType.DRIVING_LICENCE],
      [62, 23, 15],
    );
    const isAadhaar = documentType === KycDocumentType.AADHAAR;

    return {
      id: rng.uuid(),
      workerId: worker.id,
      documentType,
      documentImageUrl: rng.pick(DOCUMENT_IMAGES),
      submittedAt: isoAgo(rng.int(0, 12), -rng.int(0, 13 * 60)),
      /* Only an Aadhaar submission carries a reference and last four digits. */
      ...(isAadhaar
        ? {
            aadhaarRef: aadhaarReference(rng),
            aadhaarLast4: String(rng.int(1000, 9999)),
          }
        : {}),
    } satisfies KycSubmission;
  });
}
