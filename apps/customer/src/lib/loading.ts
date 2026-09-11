import { useEffect, useState } from 'react';

/**
 * Where Phase 5 hangs its loading states.
 *
 * Every screen that will eventually fetch already asks this hook whether its
 * data is in flight and renders skeletons when it says yes. Today the answer
 * comes from a demo constant rather than from a request, so the states are
 * real code on a real path rather than a branch nobody has ever executed —
 * the failure mode with "we'll add loading later" is that the skeletons are
 * written against a layout that has since moved.
 *
 * Phase 5 replaces the body with the query client's `isLoading` for `key` and
 * deletes the constant. No screen changes.
 */

/**
 * How long screens pretend to load, in milliseconds. ZERO IS OFF.
 *
 * Set it to something like 1200 to walk the skeletons before a demo, then put
 * it back. It is deliberately not wired to `__DEV__`: a delay that only
 * appears in development is one nobody checks in the build that ships.
 */
export const DEMO_LOADING_MS = 0;

/**
 * Whether the data behind `key` is still arriving.
 *
 * `key` is unused today and is here because it is what makes the Phase 5
 * swap a one-line change instead of a signature change at every call site.
 */
export function useResourceLoading(key: string): boolean {
  const [loading, setLoading] = useState(DEMO_LOADING_MS > 0);

  useEffect(() => {
    if (DEMO_LOADING_MS <= 0) return;

    setLoading(true);
    const timer = setTimeout(() => setLoading(false), DEMO_LOADING_MS);
    return () => clearTimeout(timer);
  }, [key]);

  return loading;
}
