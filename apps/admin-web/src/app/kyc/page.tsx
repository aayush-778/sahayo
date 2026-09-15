import { redirect } from 'next/navigation';

/**
 * The verification queue was renamed from /kyc. The old path is kept as a
 * redirect so any bookmark or link written during scaffolding still resolves.
 */
export default function KycRedirect() {
  redirect('/verification');
}
