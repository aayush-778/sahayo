import { CATEGORY_ID_BY_WORKER_CATEGORY, type KycQueueEntry } from '@sahayo/shared';

import { ONBOARDING_SUBMITTED } from '../navigation/gate';
import { api, startRealtime, stopRealtime } from '../realtime';
import { reseedSession } from '../store/session';
import { EMPTY_DOCUMENTS, useWorkerStore } from '../store/worker';
import { restoreDemoPartner } from './auth';

/**
 * Demo tools — so the two-phone demo can be run again without redoing
 * registration on stage.
 *
 * DEVELOPMENT BUILDS ONLY. `__DEV__` is false in a release build, so the
 * entry points are not rendered there and these functions are never reached.
 */
export const DEMO_TOOLS_ENABLED = __DEV__;

/**
 * Back to a phone that has never registered: no account, a freshly seeded
 * session. The chosen language is kept — it belongs to the person holding the
 * phone, and a Hindi demo should restart in Hindi.
 */
export async function resetDemo(): Promise<void> {
  useWorkerStore.getState().reset();
  reseedSession();
}

/**
 * Straight to the moment the demo is about: an approved worker, online, with
 * job requests waiting on the dashboard.
 */
export async function jumpToApprovedWorker(): Promise<void> {
  restoreDemoPartner({ online: true });
}

export type PendingSignInResult = { ok: true; name: string } | { ok: false; reason: 'unreachable' | 'queue_empty' };

/**
 * Signs this phone in as the first member in the cooperative's verification queue: an
 * onboarded partner whose documents are waiting to be checked. The app shows the waiting
 * state; approving them in the admin portal flips this phone to approved over the socket.
 *
 * Needs the server, which is where the queue is.
 */
export async function signInAsPendingMember(): Promise<PendingSignInResult> {
  let queue: KycQueueEntry[];
  try {
    queue = await api<KycQueueEntry[]>('GET', '/admin/kyc/queue');
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
  const member = queue[0];
  if (!member) return { ok: false, reason: 'queue_empty' };

  stopRealtime();
  const store = useWorkerStore.getState();
  store.reset();
  store.patch({
    name: member.name,
    phone: member.phone,
    city: 'patna',
    primaryCategory: CATEGORY_ID_BY_WORKER_CATEGORY[member.category],
    documents: { ...EMPTY_DOCUMENTS, idProof: 'uploaded', addressProof: 'uploaded', photo: 'uploaded' },
    onboardingStep: ONBOARDING_SUBMITTED,
    isApproved: false,
    isAvailable: false,
    isAuthenticated: true,
  });
  reseedSession();
  void startRealtime(member.phone);
  return { ok: true, name: member.name };
}
