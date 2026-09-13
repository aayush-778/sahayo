import { WorkerProfile } from '@/components/workers/WorkerProfile';
import { listWorkers } from '@/lib/services';

/**
 * Every member's profile is built as a static page.
 *
 * The seed is deterministic, so the 140 worker ids are known at build time. Static pages
 * are what let the offline service worker precache every profile, so a profile opens
 * with the network off even if nobody visited it first. An id that is not in the seed
 * still renders, and the profile shows its own "not found" state.
 */
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  const workers = await listWorkers();
  return workers.map((worker) => ({ id: worker.id }));
}

export default function WorkerProfilePage() {
  return <WorkerProfile />;
}
