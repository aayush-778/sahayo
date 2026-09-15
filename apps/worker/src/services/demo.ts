import { reseedSession } from '../store/session';
import { useWorkerStore } from '../store/worker';
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
