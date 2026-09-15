import { useShallow } from 'zustand/react/shallow';
import type { AppLanguage } from '@sahayo/ui-native';

import { COORDINATOR } from '../mocks';
import { useWorkerStore, type WorkerProfileFields } from '../store/worker';
import { isValidIndianMobile, toE164 } from './otp';

/**
 * The partner's own record, for screens.
 *
 * `useShallow` because this returns an object assembled from several fields: a
 * plain selector would build a new object on every call and re-render the
 * screen on every store write, whether or not these fields changed.
 */
export function useWorkerProfile(): WorkerProfileFields & { isAuthenticated: boolean } {
  return useWorkerStore(
    useShallow((state) => ({
      name: state.name,
      gender: state.gender,
      dob: state.dob,
      phone: state.phone,
      city: state.city,
      yearsExperience: state.yearsExperience,
      primaryCategory: state.primaryCategory,
      subCategories: state.subCategories,
      otherService: state.otherService,
      documents: state.documents,
      idProofType: state.idProofType,
      documentFiles: state.documentFiles,
      onboardingStep: state.onboardingStep,
      isApproved: state.isApproved,
      isAvailable: state.isAvailable,
      serviceRadiusKm: state.serviceRadiusKm,
      alternatePhone: state.alternatePhone,
      workingHours: state.workingHours,
      workingDays: state.workingDays,
      baseRatePaise: state.baseRatePaise,
      upiId: state.upiId,
      isAuthenticated: state.isAuthenticated,
    })),
  );
}

export interface ProfileEdit {
  name?: string;
  city?: string;
  yearsExperience?: number;
  /** Ten digits, or '' to remove. */
  alternatePhone?: string;
  upiId?: string;
}

export type ProfileResult = { ok: true } | { ok: false; reason: 'invalid_name' | 'invalid_phone' | 'invalid_upi' };

/** `name@bank` — the shape every UPI app shows, checked loosely: the bank confirms it. */
const UPI_PATTERN = /^[a-z0-9._-]{2,}@[a-z][a-z0-9]+$/i;

export function isValidUpiId(value: string): boolean {
  return UPI_PATTERN.test(value.trim());
}

/**
 * Saves profile edits. Every field is checked before anything is written, so
 * an invalid field never leaves the others half-saved. The login mobile number
 * is not editable here — it is the partner's identity.
 */
export async function updateProfile(edit: ProfileEdit): Promise<ProfileResult> {
  const { phone, patch } = useWorkerStore.getState();
  const clean: Partial<WorkerProfileFields> = {};

  if (edit.name !== undefined) {
    if (edit.name.trim().length < 2) return { ok: false, reason: 'invalid_name' };
    clean.name = edit.name.trim();
  }
  if (edit.city !== undefined && edit.city.trim()) clean.city = edit.city.trim();
  if (edit.yearsExperience !== undefined) {
    clean.yearsExperience = Math.max(0, Math.min(60, Math.round(edit.yearsExperience)));
  }
  if (edit.alternatePhone !== undefined) {
    if (edit.alternatePhone === '') {
      clean.alternatePhone = '';
    } else if (!isValidIndianMobile(edit.alternatePhone) || toE164(edit.alternatePhone) === phone) {
      return { ok: false, reason: 'invalid_phone' };
    } else {
      clean.alternatePhone = toE164(edit.alternatePhone);
    }
  }
  if (edit.upiId !== undefined) {
    if (!isValidUpiId(edit.upiId)) return { ok: false, reason: 'invalid_upi' };
    clean.upiId = edit.upiId.trim().toLowerCase();
  }

  patch(clean);
  return { ok: true };
}

export function useLanguage(): AppLanguage {
  return useWorkerStore((state) => state.language);
}

/** Switches the whole app's language, immediately and persistently. */
export async function setLanguage(language: AppLanguage): Promise<void> {
  useWorkerStore.getState().setLanguage(language);
}

/** The cooperative coordinator this partner calls for help. */
export function getCoordinator(): typeof COORDINATOR {
  return COORDINATOR;
}
