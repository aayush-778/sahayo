import { NAV_ITEMS } from '@/lib/nav/routes';
import { listWorkers } from '@/lib/services';

export const dynamic = 'force-static';

/**
 * Every page the offline service worker should precache, generated at build time.
 *
 * The navigation model supplies the top-level routes, so a page added to the sidebar is
 * precached without anyone remembering to list it in public/sw.js, and the seed supplies
 * one profile per member.
 */
export async function GET(): Promise<Response> {
  const workers = await listWorkers();
  const routes = [...NAV_ITEMS.map((item) => item.href), ...workers.map((worker) => `/workers/${worker.id}`)];
  return Response.json({ routes });
}
