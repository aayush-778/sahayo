import { useEffect } from 'react';

import { ONBOARDING_SUBMITTED } from '../navigation/gate';
import { startRealtime, stopRealtime } from '../realtime';
import { useConnectionStore, type ConnectionMode } from '../store/connection';
import { useWorkerStore } from '../store/worker';

/**
 * Keeps the live connection in step with who is signed in: open while an onboarded
 * partner is signed in on this phone — approved or still waiting, because the approval
 * itself arrives over the connection — and closed otherwise. Mounted once, at the
 * root, so it survives every navigation — including a cold start with a partner already
 * signed in.
 */
export function useRealtimeSession(): void {
  const isAuthenticated = useWorkerStore((state) => state.isAuthenticated);
  const onboardingStep = useWorkerStore((state) => state.onboardingStep);
  const phone = useWorkerStore((state) => state.phone);
  const wanted = isAuthenticated && onboardingStep >= ONBOARDING_SUBMITTED && Boolean(phone);

  useEffect(() => {
    if (!wanted) {
      stopRealtime();
      return;
    }
    void startRealtime(phone);
  }, [wanted, phone]);
}

export interface ConnectionView {
  mode: ConnectionMode;
  attempt: number;
  /** When the connection last came back after dropping, in epoch milliseconds. */
  restoredAt: number | null;
}

/** The connection's state, for the banner. */
export function useConnection(): ConnectionView {
  const mode = useConnectionStore((state) => state.mode);
  const attempt = useConnectionStore((state) => state.attempt);
  const restoredAt = useConnectionStore((state) => state.restoredAt);
  return { mode, attempt, restoredAt };
}
