import type { Id } from '@sahayo/shared';
import { useShallow } from 'zustand/react/shallow';

import { SAMPLE_UPLOADS } from '../mocks';
import { ONBOARDING_STEPS, ONBOARDING_SUBMITTED, useWorkerStore, type WorkerProfileFields } from '../store/worker';
import {
  REQUIRED_DOCUMENTS,
  WEEKDAYS,
  type DocumentKind,
  type IdProofType,
  type Weekday,
  type WorkingHours,
} from '../types';
import type { PersonalDetails } from './auth';
import { findWorkerType, getSubCategories } from './catalogue';
import { toE164 } from './otp';
import {
  ACCEPTED_DOCUMENT_TYPES,
  BASE_RATE_MAX_RUPEES,
  BASE_RATE_MIN_RUPEES,
  MAX_DOCUMENT_BYTES,
  MAX_EXPERIENCE_YEARS,
  minutesOf,
  SERVICE_RADIUS_MAX_KM,
  SERVICE_RADIUS_MIN_KM,
} from './registration';

/**
 * Onboarding, one function per step.
 *
 * Saving a step only ever moves `onboardingStep` FORWARD, and only to the step
 * after the one being saved. Going back to edit an earlier step is allowed;
 * saving it again does not rewind progress already made.
 *
 * None of these navigate. Each step's Next button saves, and on success moves
 * to the next route itself.
 */

/**
 * Re-exported from the pure gate module, so screens read the step constants and
 * route mapping without importing a store — and so "five steps" is defined in
 * exactly one place.
 */
export {
  isOnboardingComplete,
  ONBOARDING_STEPS,
  ONBOARDING_SUBMITTED,
  routeForStep,
  STEP_FOR_ROUTE,
} from '../navigation/gate';

export type OnboardingResult = { ok: true } | { ok: false; reason: string };

function advanceTo(step: number): void {
  const { onboardingStep, patch } = useWorkerStore.getState();
  if (step > onboardingStep) patch({ onboardingStep: step });
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// --- Step 1 -----------------------------------------------------------------

/**
 * Step 1 again, for a partner already registered who came back with Previous.
 *
 * The mobile number is not here: it was verified by OTP when the account was
 * made and is what they log in with, so it cannot be changed from this form.
 */
export async function savePersonalDetails(details: Omit<PersonalDetails, 'mobile'>): Promise<OnboardingResult> {
  const { isAuthenticated, patch } = useWorkerStore.getState();
  if (!isAuthenticated) return { ok: false, reason: 'not_registered' };
  if (details.name.trim().length < 2 || !details.city || !details.dob) return { ok: false, reason: 'incomplete' };

  patch({
    name: details.name.trim(),
    gender: details.gender,
    dob: details.dob,
    alternatePhone: details.alternatePhone ? toE164(details.alternatePhone) : '',
    city: details.city,
  });
  advanceTo(2);
  return { ok: true };
}

// --- Step 2 -----------------------------------------------------------------

export interface ServiceDetails {
  yearsExperience: number;
  primaryCategory: Id;
  subCategories: Id[];
  /** '' when "Other" is not ticked. */
  otherService: string;
  serviceRadiusKm: number;
}

export async function saveServiceDetails(details: ServiceDetails): Promise<OnboardingResult> {
  if (!findWorkerType(details.primaryCategory)) return { ok: false, reason: 'unknown_worker_type' };
  // Only sub-categories of the chosen category survive: switching from
  // electrician to plumber must not leave "wiring" behind.
  const allowed = new Set(getSubCategories(details.primaryCategory).map((entry) => entry.id));
  const subCategories = details.subCategories.filter((id) => allowed.has(id));
  const otherService = details.otherService.trim();
  if (subCategories.length === 0 && !otherService) return { ok: false, reason: 'no_sub_categories' };
  if (details.yearsExperience < 0 || details.yearsExperience > MAX_EXPERIENCE_YEARS) {
    return { ok: false, reason: 'experience_out_of_range' };
  }
  if (details.serviceRadiusKm < SERVICE_RADIUS_MIN_KM || details.serviceRadiusKm > SERVICE_RADIUS_MAX_KM) {
    return { ok: false, reason: 'radius_out_of_range' };
  }

  useWorkerStore.getState().patch({
    yearsExperience: Math.round(details.yearsExperience),
    primaryCategory: details.primaryCategory,
    subCategories,
    otherService,
    serviceRadiusKm: Math.round(details.serviceRadiusKm),
  });
  advanceTo(3);
  return { ok: true };
}

// --- Step 3 -----------------------------------------------------------------

/**
 * Chooses which government ID is being uploaded.
 *
 * Changing it discards a file already uploaded as the ID: an Aadhaar image
 * filed as a PAN card would reach the cooperative mislabelled.
 */
export async function selectIdProofType(type: IdProofType): Promise<void> {
  const { idProofType, documents, documentFiles, patch } = useWorkerStore.getState();
  if (idProofType === type) return;
  const { idProof: _discarded, ...rest } = documentFiles;
  patch({ idProofType: type, documents: { ...documents, idProof: 'missing' }, documentFiles: rest });
}

/**
 * Attaches a file to one proof.
 *
 * Simulated — see src/mocks/documents.ts — but it still enforces the limits
 * the upload box states, so Phase 5 swaps where the file comes from and
 * nothing about what is accepted.
 */
export async function uploadDocument(kind: DocumentKind): Promise<OnboardingResult> {
  const { idProofType } = useWorkerStore.getState();
  if (kind === 'idProof' && !idProofType) return { ok: false, reason: 'id_type_required' };

  const sample = kind === 'idProof' && idProofType ? SAMPLE_UPLOADS[idProofType] : SAMPLE_UPLOADS[kind === 'idProof' ? 'aadhaar' : kind];
  if (sample.sizeBytes > MAX_DOCUMENT_BYTES) return { ok: false, reason: 'too_large' };
  if (!ACCEPTED_DOCUMENT_TYPES.includes(sample.mimeType)) return { ok: false, reason: 'unsupported_type' };

  await pause(700);
  const { documents, documentFiles, patch } = useWorkerStore.getState();
  patch({
    documents: { ...documents, [kind]: 'uploaded' },
    documentFiles: { ...documentFiles, [kind]: { ...sample, uploadedAt: new Date().toISOString() } },
  });
  return { ok: true };
}

export async function removeDocument(kind: DocumentKind): Promise<void> {
  const { documents, documentFiles, patch } = useWorkerStore.getState();
  const rest = { ...documentFiles };
  delete rest[kind];
  patch({ documents: { ...documents, [kind]: 'missing' }, documentFiles: rest });
}

function documentsReady(state: Pick<WorkerProfileFields, 'documents' | 'idProofType'>): boolean {
  return (
    state.idProofType !== null &&
    REQUIRED_DOCUMENTS.every((kind) => state.documents[kind] === 'uploaded' || state.documents[kind] === 'verified')
  );
}

/** Documents are done when an ID type is chosen and every proof is at least uploaded. */
export async function completeDocuments(): Promise<OnboardingResult> {
  const state = useWorkerStore.getState();
  if (!state.idProofType) return { ok: false, reason: 'id_type_required' };
  const missing = REQUIRED_DOCUMENTS.filter(
    (kind) => state.documents[kind] === 'missing' || state.documents[kind] === 'rejected',
  );
  if (missing.length > 0) return { ok: false, reason: `missing:${missing.join(',')}` };
  advanceTo(4);
  return { ok: true };
}

// --- Step 4 -----------------------------------------------------------------

export interface AvailabilityDetails {
  workingHours: WorkingHours;
  workingDays: Weekday[];
  /** Integer paise. */
  baseRatePaise: number;
}

/** When the partner works, and what they charge. */
export async function saveAvailability(details: AvailabilityDetails): Promise<OnboardingResult> {
  const start = minutesOf(details.workingHours.start);
  const end = minutesOf(details.workingHours.end);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return { ok: false, reason: 'invalid_hours' };
  const days = WEEKDAYS.filter((day) => details.workingDays.includes(day));
  if (days.length === 0) return { ok: false, reason: 'no_days' };
  if (
    !Number.isInteger(details.baseRatePaise) ||
    details.baseRatePaise < BASE_RATE_MIN_RUPEES * 100 ||
    details.baseRatePaise > BASE_RATE_MAX_RUPEES * 100
  ) {
    return { ok: false, reason: 'invalid_rate' };
  }

  useWorkerStore.getState().patch({
    workingHours: { ...details.workingHours },
    workingDays: days,
    baseRatePaise: details.baseRatePaise,
  });
  advanceTo(5);
  return { ok: true };
}

// --- Step 5 -----------------------------------------------------------------

export type OnboardingSection = 'personal' | 'service' | 'documents' | 'availability';
export const ONBOARDING_SECTIONS: readonly OnboardingSection[] = ['personal', 'service', 'documents', 'availability'];

export type OnboardingCompletion = Record<OnboardingSection, boolean> & { done: number; total: number };

/**
 * Which sections hold everything they need — read from the saved record, not
 * from how far the partner has clicked. A partner can reach review and still
 * have a hole, for instance documents cleared by a data migration.
 */
export function getOnboardingCompletion(state: WorkerProfileFields): OnboardingCompletion {
  const sections: Record<OnboardingSection, boolean> = {
    personal: Boolean(state.name && state.gender && state.dob && state.phone && state.city),
    service: Boolean(state.primaryCategory) && (state.subCategories.length > 0 || state.otherService !== ''),
    documents: documentsReady(state),
    availability: state.workingHours !== null && state.workingDays.length > 0 && state.baseRatePaise !== null,
  };
  return {
    ...sections,
    done: ONBOARDING_SECTIONS.filter((section) => sections[section]).length,
    total: ONBOARDING_SECTIONS.length,
  };
}

export function useOnboardingCompletion(): OnboardingCompletion {
  return useWorkerStore(useShallow((state) => getOnboardingCompletion(state)));
}

/**
 * Submits the application. Onboarding is over; approval is not.
 *
 * The partner lands on the dashboard and sees the pending-approval state,
 * because `isApproved` is the cooperative's decision and stays false here.
 */
export async function submitForReview(confirmed: boolean): Promise<OnboardingResult> {
  const state = useWorkerStore.getState();
  if (!confirmed) return { ok: false, reason: 'not_confirmed' };
  if (state.onboardingStep < ONBOARDING_STEPS) return { ok: false, reason: 'steps_incomplete' };
  if (getOnboardingCompletion(state).done < ONBOARDING_SECTIONS.length) return { ok: false, reason: 'sections_incomplete' };
  state.patch({ onboardingStep: ONBOARDING_SUBMITTED, isApproved: false, isAvailable: false });
  return { ok: true };
}

/**
 * Stands in for the cooperative approving the application.
 *
 * In Phase 5 this is a decision made in admin-web and pushed over the socket;
 * the worker never approves themselves. It exists so the pending-approval state
 * can be moved past during a demo without a second app on the table.
 */
export async function simulateApproval(): Promise<void> {
  const { documents, patch } = useWorkerStore.getState();
  const verified = { ...documents };
  for (const kind of Object.keys(verified) as DocumentKind[]) {
    if (verified[kind] === 'uploaded') verified[kind] = 'verified';
  }
  patch({ isApproved: true, documents: verified });
}
