import { redirect } from 'next/navigation';

/** The portal has no separate landing page; the dashboard is the front door. */
export default function RootPage() {
  redirect('/dashboard');
}
