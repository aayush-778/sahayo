import { DEMO_PARTNER } from '../mocks';
import { startRealtime, stopRealtime } from '../realtime';
import { reseedSession } from '../store/session';
import { EMPTY_DOCUMENTS, ONBOARDING_SUBMITTED, useWorkerStore } from '../store/worker';
import type { Gender } from '../types';
import { toE164, verifyOtp, type OtpFailure } from './otp';

/**
 * Logging in, completing a profile, and signing out — all by phone and OTP.
 *
 * Both entry points verify the code themselves rather than trusting that the
 * screen already did. In Phase 5 the server is the one that checks it, so the
 * check belongs behind this boundary, not in front of it.
 */

export type AuthResult = { ok: true } | { ok: false; reason: OtpFailure };

/** Step 1 of onboarding: the Complete Your Profile screen. */
export interface PersonalDetails {
  name: string;
  gender: Gender;
  /** YYYY-MM-DD. */
  dob: string;
  /** Ten digits, without +91. */
  mobile: string;
  /** Ten digits, or '' for none. */
  alternatePhone: string;
  /** A city id from src/data/cities.ts. */
  city: string;
}

/**
 * Registers a new partner and completes step 1.
 *
 * It does not navigate: the signup screen moves on to service details once
 * this resolves, the same way every other step's Next does.
 */
export async function signUp(details: PersonalDetails, otp: string): Promise<AuthResult> {
  const verified = await verifyOtp(details.mobile, otp);
  if (!verified.ok) return verified;

  const store = useWorkerStore.getState();
  store.reset();
  store.patch({
    name: details.name.trim(),
    gender: details.gender,
    dob: details.dob,
    phone: toE164(details.mobile),
    alternatePhone: details.alternatePhone ? toE164(details.alternatePhone) : '',
    city: details.city,
    documents: { ...EMPTY_DOCUMENTS },
    onboardingStep: 2,
    isApproved: false,
    isAvailable: false,
    isAuthenticated: true,
  });
  reseedSession();
  return { ok: true };
}

/**
 * Logs a returning partner in.
 *
 * With no backend to look the number up against, a verified code restores the
 * demo partner: onboarded, approved, and offline until they choose otherwise.
 * That is the branch of the gate that lands on the tabs.
 */
export async function signIn(mobile: string, otp: string): Promise<AuthResult> {
  const verified = await verifyOtp(mobile, otp);
  if (!verified.ok) return verified;

  restoreDemoPartner({ phone: toE164(mobile), online: false });
  return { ok: true };
}

/**
 * Puts the demo partner on this phone: onboarded, approved, with a fresh
 * session. Shared by login (offline, as a worker would be on opening the app)
 * and the demo shortcut (online, with requests waiting).
 */
export function restoreDemoPartner({ phone = DEMO_PARTNER.phone, online }: { phone?: string; online: boolean }): void {
  // A fresh session: close any connection first, and open one again once the partner is restored.
  stopRealtime();
  const store = useWorkerStore.getState();
  store.reset();
  store.patch({
    ...DEMO_PARTNER,
    phone,
    subCategories: [...DEMO_PARTNER.subCategories],
    documents: { ...DEMO_PARTNER.documents },
    documentFiles: { ...DEMO_PARTNER.documentFiles },
    workingHours: { ...DEMO_PARTNER.workingHours },
    workingDays: [...DEMO_PARTNER.workingDays],
    onboardingStep: ONBOARDING_SUBMITTED,
    isApproved: true,
    isAvailable: online,
    isAuthenticated: true,
  });
  reseedSession();
  void startRealtime(phone);
}

/** Clears the partner record and the session. The chosen language is kept. */
export async function signOut(): Promise<void> {
  stopRealtime();
  useWorkerStore.getState().reset();
  reseedSession();
}
