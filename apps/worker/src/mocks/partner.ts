import type { Id } from '@sahayo/shared';

import type {
  DocumentKind,
  Localized,
  DocumentStatus,
  Gender,
  IdProofType,
  UploadedFile,
  Weekday,
  WorkingHours,
} from '../types';
import { SAMPLE_UPLOADS } from './documents';
import { places } from './places';

/**
 * The returning partner a demo sign-in restores.
 *
 * Signing in on a fresh install has no backend to look the number up against,
 * so a verified OTP restores this record: an approved, fully onboarded
 * electrician. That is what makes both gates demonstrable from the auth
 * screens — log in and you land on the tabs; complete your profile instead and
 * you land in onboarding.
 */
export const DEMO_WORKER_ID: Id = 'wrk_suresh';
export const DEMO_COOPERATIVE_ID: Id = 'coop_patna_central';

/**
 * Where the demo partner sets out from: Rajendra Nagar, which is also the
 * centre of the bundled Patna basemap. Phase 5 replaces it with live GPS.
 */
export const DEMO_WORKER_BASE = places.rajendraNagar.point;

/** The cooperative coordinator a partner calls for help. */
export const COORDINATOR: { name: string; phone: string; office: Localized; hours: Localized } = {
  name: 'Meena Kumari',
  phone: '+916122240180',
  office: {
    en: 'Patna Central Workers’ Cooperative, Kankarbagh Main Road, Patna 800020',
    hi: 'पटना सेंट्रल श्रमिक सहकारी समिति, कंकड़बाग मेन रोड, पटना 800020',
  },
  hours: { en: 'Monday to Saturday, 9 am to 6 pm', hi: 'सोमवार से शनिवार, सुबह 9 से शाम 6 बजे तक' },
};

export const DEMO_PARTNER: {
  name: string;
  gender: Gender;
  dob: string;
  phone: string;
  alternatePhone: string;
  /** A city id from src/data/cities.ts — localised at the render edge. */
  city: string;
  yearsExperience: number;
  primaryCategory: Id;
  subCategories: Id[];
  otherService: string;
  documents: Record<DocumentKind, DocumentStatus>;
  idProofType: IdProofType;
  documentFiles: Record<DocumentKind, UploadedFile>;
  serviceRadiusKm: number;
  workingHours: WorkingHours;
  workingDays: Weekday[];
  baseRatePaise: number;
  upiId: string;
} = {
  name: 'Suresh Yadav',
  gender: 'male',
  dob: '1988-04-17',
  phone: '+919431012845',
  alternatePhone: '+917654321987',
  city: 'patna',
  yearsExperience: 9,
  primaryCategory: 'cat_electricians',
  subCategories: [
    'sub_basic_electrical',
    'sub_wiring_installation',
    'sub_power_backup_solar',
    'sub_motors_pumps',
    'sub_commercial_electrical',
  ],
  otherService: '',
  documents: {
    idProof: 'verified',
    // Not accepted, so Profile → Documents has a real re-upload to show in the demo.
    addressProof: 'rejected',
    photo: 'verified',
  },
  idProofType: 'aadhaar',
  documentFiles: {
    idProof: { ...SAMPLE_UPLOADS.aadhaar, uploadedAt: '2025-11-04T10:30:00.000Z' },
    addressProof: { ...SAMPLE_UPLOADS.addressProof, uploadedAt: '2025-11-04T10:32:00.000Z' },
    photo: { ...SAMPLE_UPLOADS.photo, uploadedAt: '2025-11-04T10:34:00.000Z' },
  },
  serviceRadiusKm: 6,
  workingHours: { start: '08:00', end: '19:00' },
  workingDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  baseRatePaise: 30000,
  upiId: 'suresh.yadav@okaxis',
};

/** Demo details for filling the registration form quickly during a rehearsal. */
export const DEMO_REGISTRATION: {
  name: string;
  gender: Gender;
  dob: string;
  mobile: string;
  city: string;
} = {
  name: 'Pooja Kumari',
  gender: 'female',
  dob: '1994-09-02',
  mobile: '8210445566',
  city: 'patna',
};
