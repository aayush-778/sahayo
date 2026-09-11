import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '../store/auth';
import { useBookingDraftStore } from '../store/bookingDraft';
import { useBookingsStore } from '../store/bookings';

/**
 * Puts the app back to a fresh install, without a reinstall.
 *
 * A pitch gets given more than once, and the second run has to start from the
 * signup screen with no name, no bookings and no half-finished draft. Without
 * this the only way back is to uninstall and reinstall between runs, in front
 * of the people you are pitching to.
 *
 * WHAT IT CLEARS: the persisted auth record, the in-memory booking stores,
 * and any draft. WHAT IT KEEPS: the chosen language. Resetting that would
 * throw away the one preference a Hindi-speaking presenter has to set again
 * before every single run, and language is not part of the story being reset.
 *
 * Reached by long-pressing the version line at the bottom of Profile. Hidden
 * rather than absent, for the same reason the tracker's status advance is
 * hidden: it has to be there for whoever is presenting and must not be
 * reachable by a judge holding the phone.
 */
export async function resetDemo(): Promise<void> {
  useBookingDraftStore.getState().clear();
  useBookingsStore.getState().reset();

  // Drop the persisted auth record itself, not just the in-memory copy —
  // otherwise zustand rehydrates the old name on the next cold start and the
  // "fresh install" lasts until the app is next killed.
  try {
    await AsyncStorage.removeItem('sahayo.auth');
  } catch {
    // A storage failure must not leave the app half-reset: the in-memory
    // logout below still returns the user to signup for this run.
  }

  useAuthStore.getState().logout();
}
