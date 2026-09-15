import type { DocumentKind, IdProofType, UploadedFile } from '../types';

/**
 * The file a simulated upload attaches.
 *
 * There is no file picker in this build — expo-image-picker and
 * expo-document-picker are native modules with config plugins, which this
 * phase does not add. Tapping an upload box attaches the sample below for that
 * proof, with a real name, size and type, so every rule downstream (the 5 MB
 * cap, the accepted types, "all three uploaded") runs against a plausible file.
 */
export const SAMPLE_UPLOADS = {
  aadhaar: { name: 'aadhaar-card.jpg', sizeBytes: 1_184_320, mimeType: 'image/jpeg' },
  pan: { name: 'pan-card.jpg', sizeBytes: 842_112, mimeType: 'image/jpeg' },
  drivingLicense: { name: 'driving-licence.pdf', sizeBytes: 1_960_448, mimeType: 'application/pdf' },
  addressProof: { name: 'electricity-bill.pdf', sizeBytes: 2_412_544, mimeType: 'application/pdf' },
  photo: { name: 'recent-photo.jpg', sizeBytes: 1_530_880, mimeType: 'image/jpeg' },
} satisfies Record<IdProofType | Exclude<DocumentKind, 'idProof'>, Omit<UploadedFile, 'uploadedAt'>>;
