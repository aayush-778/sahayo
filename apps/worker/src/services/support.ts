import { useMemo } from 'react';
import type { Paise } from '@sahayo/shared';

import { useSessionStore } from '../store/session';
import { CLAIM_TYPES, LOAN_PURPOSES, type ClaimType, type LoanPurpose, type SupportRequest } from '../types';

/**
 * Asking the fund for help: an interest-free tool loan, or an emergency claim.
 *
 * Both are requests a coordinator decides, not payouts — so submitting one
 * records it as Sent, and the status moves on in Phase 5 when the coordinator
 * acts in the admin portal.
 */

/** Whole rupees. The loan limit is the one members voted for. */
export const LOAN_MIN_RUPEES = 500;
export const LOAN_MAX_RUPEES = 5000;
export const LOAN_REPAYMENT_MONTHS = [3, 6, 10] as const;
export const CLAIM_MIN_RUPEES = 500;
export const CLAIM_MAX_RUPEES = 50000;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const OPEN_LOAN_STATUSES = new Set<SupportRequest['status']>(['submitted', 'under_review', 'approved', 'repaying']);

/** One loan at a time: a member repays before borrowing again. */
export function hasOpenLoan(requests: SupportRequest[]): boolean {
  return requests.some((request) => request.kind === 'loan' && OPEN_LOAN_STATUSES.has(request.status));
}

export function useSupportRequests(): SupportRequest[] {
  const requests = useSessionStore((state) => state.supportRequests);
  return useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests],
  );
}

/** A monthly instalment, rounded up to a whole rupee so the last one is never short. */
export function monthlyInstalment(amount: Paise, months: number): Paise {
  return Math.ceil(amount / months / 100) * 100;
}

export type SupportFailure =
  | 'amount_out_of_range'
  | 'details_required'
  | 'invalid_purpose'
  | 'invalid_months'
  | 'loan_open';

export type SupportResult = { ok: true; id: string } | { ok: false; reason: SupportFailure };

const MIN_DETAILS = 5;

function add(request: SupportRequest): void {
  useSessionStore.setState((state) => ({ supportRequests: [request, ...state.supportRequests] }));
}

export interface LoanInput {
  amountRupees: number;
  purpose: string;
  months: number;
  details: string;
}

export async function requestLoan(input: LoanInput): Promise<SupportResult> {
  if (hasOpenLoan(useSessionStore.getState().supportRequests)) return { ok: false, reason: 'loan_open' };
  if (!Number.isInteger(input.amountRupees) || input.amountRupees < LOAN_MIN_RUPEES || input.amountRupees > LOAN_MAX_RUPEES) {
    return { ok: false, reason: 'amount_out_of_range' };
  }
  if (!(LOAN_PURPOSES as readonly string[]).includes(input.purpose)) return { ok: false, reason: 'invalid_purpose' };
  if (!(LOAN_REPAYMENT_MONTHS as readonly number[]).includes(input.months)) return { ok: false, reason: 'invalid_months' };
  if (input.details.trim().length < MIN_DETAILS) return { ok: false, reason: 'details_required' };

  await pause(800);
  const now = new Date().toISOString();
  const id = `sup_${Date.now().toString(36)}`;
  add({
    id,
    kind: 'loan',
    amount: input.amountRupees * 100,
    purpose: input.purpose as LoanPurpose,
    details: input.details.trim(),
    repaymentMonths: input.months,
    repaidPaise: 0,
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, id };
}

export interface ClaimInput {
  amountRupees: number;
  type: string;
  details: string;
}

export async function submitClaim(input: ClaimInput): Promise<SupportResult> {
  if (!Number.isInteger(input.amountRupees) || input.amountRupees < CLAIM_MIN_RUPEES || input.amountRupees > CLAIM_MAX_RUPEES) {
    return { ok: false, reason: 'amount_out_of_range' };
  }
  if (!(CLAIM_TYPES as readonly string[]).includes(input.type)) return { ok: false, reason: 'invalid_purpose' };
  if (input.details.trim().length < MIN_DETAILS) return { ok: false, reason: 'details_required' };

  await pause(800);
  const now = new Date().toISOString();
  const id = `sup_${Date.now().toString(36)}`;
  add({
    id,
    kind: 'claim',
    amount: input.amountRupees * 100,
    purpose: input.type as ClaimType,
    details: input.details.trim(),
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, id };
}
