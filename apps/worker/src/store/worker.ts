import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Id } from '@sahayo/shared';
import { setAppLanguage, type AppLanguage } from '@sahayo/ui-native';

import {
  DOCUMENT_KINDS,
  type DocumentKind,
  type DocumentStatus,
  type Gender,
  type IdProofType,
  type UploadedFile,
  type Weekday,
  type WorkingHours,
} from '../types';

/**
 * The partner's own record: identity, onboarding progress, approval, and
 * whether they are taking work right now. Persisted, because every field here
 * has to survive the app being killed mid-registration.
 *
 * Screens do not write to this store. `src/services` does, so that the rules
 * — you cannot go online before approval, you cannot skip an onboarding step —
 * live in one place and Phase 5 can put an API call behind each of them.
 */

/** The steps themselves are listed, once, in src/navigation/gate.ts. */
export { ONBOARDING_STEPS, ONBOARDING_SUBMITTED } from '../navigation/gate';

export const EMPTY_DOCUMENTS = Object.fromEntries(
  DOCUMENT_KINDS.map((kind) => [kind, 'missing']),
) as Record<DocumentKind, DocumentStatus>;

export interface WorkerProfileFields {
  name: string;
  gender: Gender | null;
  /** YYYY-MM-DD. A date, not an instant: a birthday has no time zone. */
  dob: string | null;
  phone: string;
  city: string;
  yearsExperience: number;
  primaryCategory: Id | null;
  subCategories: Id[];
  /**
   * Work the catalogue has no sub-category for, in the partner's own words,
   * or '' for none. Shown to the cooperative as written; never translated.
   */
  otherService: string;
  documents: Record<DocumentKind, DocumentStatus>;
  /** Which government ID `documents.idProof` is. Null until chosen. */
  idProofType: IdProofType | null;
  documentFiles: Partial<Record<DocumentKind, UploadedFile>>;
  onboardingStep: number;
  /**
   * Set by the cooperative, not by the worker. Gates the job feed: a partner
   * still pending approval is shown a waiting state, never an empty feed —
   * an empty feed says "no work near you", which is a different and wrong
   * message.
   */
  isApproved: boolean;
  /** Drives the dashboard, and whether offers are broadcast to this worker. */
  isAvailable: boolean;
  serviceRadiusKm: number;
  /**
   * A second number, stored in E.164, or '' when none. Workers in this sector
   * often share a phone or keep two SIMs, and a coordinator who cannot reach
   * the first number needs somewhere else to try.
   */
  alternatePhone: string;
  /** Step 4, availability & rates. Null until the partner sets them. */
  workingHours: WorkingHours | null;
  workingDays: Weekday[];
  /** The partner's base charge, in integer paise. */
  baseRatePaise: number | null;
  /** Where settlements are sent. '' until the partner adds one. */
  upiId: string;
}

export interface WorkerState extends WorkerProfileFields {
  /** Beyond the shape in the brief, and required by the auth gate. */
  isAuthenticated: boolean;
  /**
   * Whether the persisted record has been read back yet. Rehydration is
   * asynchronous, so on the first frame after a cold start every field is its
   * default; a gate that trusted `isAuthenticated` then would bounce a signed
   * in partner to login on every launch.
   */
  hasHydrated: boolean;
  /**
   * Mirrored from the shared i18n bootstrap for rendering. Not persisted here:
   * `sahayo.language` belongs to @sahayo/ui-native's i18n, and two copies in
   * two keys would eventually disagree.
   */
  language: AppLanguage;

  patch: (fields: Partial<WorkerProfileFields> & { isAuthenticated?: boolean }) => void;
  reset: () => void;
  setLanguage: (language: AppLanguage) => void;
  syncLanguage: (language: AppLanguage) => void;
}

const DEFAULTS: WorkerProfileFields & { isAuthenticated: boolean } = {
  name: '',
  gender: null,
  dob: null,
  phone: '',
  city: '',
  yearsExperience: 0,
  primaryCategory: null,
  subCategories: [],
  otherService: '',
  documents: EMPTY_DOCUMENTS,
  idProofType: null,
  documentFiles: {},
  onboardingStep: 1,
  isApproved: false,
  isAvailable: false,
  serviceRadiusKm: 10,
  alternatePhone: '',
  workingHours: null,
  workingDays: [],
  baseRatePaise: null,
  upiId: '',
  isAuthenticated: false,
};

/**
 * Bumped when the persisted shape changes in a way old data cannot satisfy.
 *
 * 1 — sub-phase 4.2: documents became idProof / addressProof / photo. A record
 * saved under the old five kinds has no statuses for the new ones, so its
 * documents are cleared and the partner uploads them again at step 3.
 */
const PERSIST_VERSION = 1;

export const useWorkerStore = create<WorkerState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hasHydrated: false,
      language: 'en',

      patch: (fields) => set(fields),

      // Language survives a sign-out on purpose: it belongs to the person
      // holding the phone, not to the account that just signed out.
      reset: () => set({ ...DEFAULTS, documents: { ...EMPTY_DOCUMENTS }, documentFiles: {} }),

      setLanguage: (language) => {
        set({ language });
        void setAppLanguage(language);
      },

      syncLanguage: (language) => set({ language }),
    }),
    {
      name: 'sahayo.worker',
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hasHydrated: _h, language: _l, patch: _p, reset: _r, setLanguage: _s, syncLanguage: _y, ...persisted }) =>
        persisted,
      migrate: (persisted, version) => {
        const record = (persisted ?? {}) as Partial<WorkerState>;
        if (version < 1) {
          return {
            ...record,
            documents: { ...EMPTY_DOCUMENTS },
            idProofType: null,
            documentFiles: {},
            otherService: '',
          } as WorkerState;
        }
        return record as WorkerState;
      },
      onRehydrateStorage: () => () => {
        useWorkerStore.setState({ hasHydrated: true });
      },
    },
  ),
);
