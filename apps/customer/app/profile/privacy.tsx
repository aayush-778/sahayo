import { LegalScreen } from '../../src/components/profile/LegalScreen';

/** Sections, in reading order. The copy lives in the i18n catalogue. */
const SECTIONS = ['collect', 'use', 'share', 'location', 'store', 'rights'] as const;

export default function PrivacyScreen() {
  return <LegalScreen namespace="privacy" sections={SECTIONS} />;
}
