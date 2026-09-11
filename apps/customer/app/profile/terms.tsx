import { LegalScreen } from '../../src/components/profile/LegalScreen';

/** Sections, in reading order. The copy lives in the i18n catalogue. */
const SECTIONS = ['service', 'cooperative', 'pricing', 'cancellation', 'conduct', 'liability'] as const;

export default function TermsScreen() {
  return <LegalScreen namespace="terms" sections={SECTIONS} />;
}
