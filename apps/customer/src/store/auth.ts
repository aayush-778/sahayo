import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { setAppLanguage, type AppLanguage } from '../i18n';

/**
 * Dummy auth. There is no backend until Phase 5.
 *
 * `signup` writes a name and a phone number and flips the gate. That name is
 * what Home and Profile greet the user with, which is the whole reason the
 * store exists this early: the alternative is threading a name through props
 * from a screen that has not been designed yet.
 *
 * When the real API arrives, `signup`/`login` become async and gain an OTP
 * step. Nothing else in the shape needs to change.
 */
export interface AuthState {
  name: string;
  phone: string;
  isAuthenticated: boolean;
  language: AppLanguage;

  /**
   * Whether the persisted state has been read back from AsyncStorage yet.
   *
   * Not part of the shape the spec asked for, but the auth gate is unusable
   * without it: rehydration is asynchronous, so for the first frame after a
   * cold start `isAuthenticated` is its default `false`, and a gate that
   * trusts it bounces an already-signed-up user to the signup screen on
   * every launch.
   */
  hasHydrated: boolean;

  signup: (name: string, phone: string) => void;
  /**
   * `name` is optional so the 2.0 call shape still compiles, but the login
   * screen always passes it. Without a name, signing in on a fresh install
   * leaves Home and Profile with nobody to greet — there is no backend to
   * look the number up against.
   */
  login: (phone: string, name?: string) => void;
  logout: () => void;
  setLanguage: (language: AppLanguage) => void;
  /**
   * Seeds `language` from whatever i18n resolved at boot, without writing it
   * back to storage. `src/i18n` owns the `sahayo.language` key; this store
   * only mirrors it so components can subscribe to language in the usual way.
   */
  syncLanguage: (language: AppLanguage) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      name: '',
      phone: '',
      isAuthenticated: false,
      language: 'en',
      hasHydrated: false,

      signup: (name, phone) => {
        const trimmedName = name.trim();
        const trimmedPhone = phone.trim();
        if (!trimmedName || !trimmedPhone) return;
        set({ name: trimmedName, phone: trimmedPhone, isAuthenticated: true });
      },

      login: (phone, name) => {
        const trimmedPhone = phone.trim();
        if (!trimmedPhone) return;

        const trimmedName = name?.trim();
        set((state) => ({
          phone: trimmedPhone,
          // Keep whatever name is already stored if this call did not supply
          // one, so a login never blanks out a name a signup established.
          name: trimmedName || state.name,
          isAuthenticated: true,
        }));
      },

      logout: () => set({ name: '', phone: '', isAuthenticated: false }),

      setLanguage: (language) => {
        set({ language });
        // Fire and forget: the UI has already switched, and a failed write
        // only costs the preference on next launch.
        void setAppLanguage(language);
      },

      syncLanguage: (language) => set({ language }),
    }),
    {
      name: 'sahayo.auth',
      storage: createJSONStorage(() => AsyncStorage),
      // `language` is deliberately absent — src/i18n persists it under
      // `sahayo.language`, and two copies in two keys would eventually
      // disagree. The derived flags are recomputed, not restored.
      partialize: (state) => ({
        name: state.name,
        phone: state.phone,
        isAuthenticated: state.isAuthenticated,
      }),
      // Fires once rehydration settles, success or failure. Either way the
      // gate must stop waiting — a device that cannot read storage should
      // land on signup, not on a spinner that never resolves.
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    },
  ),
);
