import { phoneSchema } from '@sahayo/shared';

/**
 * Mobile numbers and one-time codes.
 *
 * Phone + OTP, not username + password, and the same method the customer app
 * uses. A worker who reads English with difficulty should not have to invent,
 * remember and recover a password; the phone they already carry is the
 * identity. It is also what the shared contract assumes — `phoneSchema` exists
 * precisely for the number an OTP provider hands back.
 *
 * THE CODE IS MOCKED. Every number accepts `MOCK_OTP`, and nothing is sent.
 * Phase 5 replaces `requestOtp` and `verifyOtp` with calls to the provider; the
 * screens already treat both as asynchronous and branch on their results.
 *
 * Deliberately free of any store import, so these rules can be verified outside
 * the app.
 */

export const MOCK_OTP = '123456';
export const OTP_LENGTH = 6;
export const MOBILE_DIGITS = 10;

const OTP_TTL_MS = 5 * 60_000;

/**
 * A ten-digit Indian mobile number: starts 6–9, and is a valid E.164 number
 * once +91 is prefixed. Validated against the same schema the backend will use,
 * so the client cannot accept a number the server will reject.
 */
export function isValidIndianMobile(local: string): boolean {
  return /^[6-9]\d{9}$/.test(local) && phoneSchema.safeParse(toE164(local)).success;
}

export function toE164(local: string): string {
  return `+91${local}`;
}

/** `98765 43210` becomes `+91 98765 43210`, the way the number is read aloud. */
export function formatIndianMobile(local: string): string {
  return local.length === MOBILE_DIGITS ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : `+91 ${local}`;
}

/** Keeps digits only, capped. For onChangeText on number fields. */
export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export type OtpRequestResult = { ok: true; expiresAt: string } | { ok: false; reason: 'invalid_mobile' };

export async function requestOtp(local: string): Promise<OtpRequestResult> {
  if (!isValidIndianMobile(local)) return { ok: false, reason: 'invalid_mobile' };
  return { ok: true, expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString() };
}

export type OtpFailure = 'invalid_mobile' | 'incomplete' | 'wrong_code';
export type OtpVerifyResult = { ok: true } | { ok: false; reason: OtpFailure };

export async function verifyOtp(local: string, code: string): Promise<OtpVerifyResult> {
  if (!isValidIndianMobile(local)) return { ok: false, reason: 'invalid_mobile' };
  if (code.length !== OTP_LENGTH) return { ok: false, reason: 'incomplete' };
  if (code !== MOCK_OTP) return { ok: false, reason: 'wrong_code' };
  return { ok: true };
}
