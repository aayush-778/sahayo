'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether the viewer has asked their system for less motion.
 *
 * The stylesheet already collapses CSS transitions for these viewers, but chart
 * animations, map flights and smooth scrolling are driven from JavaScript and never see
 * that rule. Those call sites read this instead. Starts false on the server and on the
 * first client render, then follows the media query, so hydration always matches.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    setReduced(media.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
