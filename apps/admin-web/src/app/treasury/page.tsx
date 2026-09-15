import { redirect } from 'next/navigation';

/**
 * The finance hub was renamed from /treasury — "treasury" is not a word any
 * worker or evaluator uses. The old path is kept as a redirect.
 */
export default function TreasuryRedirect() {
  redirect('/finance');
}
