'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

/**
 * A number that climbs to its new value instead of swapping.
 *
 * On first render it shows the value as it is. When the value changes it counts from the
 * old one to the new one over `durationMs`, easing out, so a fund total that rises by
 * ₹24 is seen rising. With reduced motion it swaps at once.
 */
export function CountUp({
  value,
  format,
  from,
  durationMs = 1800,
  className,
}: {
  value: number;
  format: (value: number) => string;
  /** Start from this instead of the previous value, for a figure that should climb on arrival. */
  from?: number;
  durationMs?: number;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(from ?? value);
  const shownRef = useRef(from ?? value);

  useEffect(() => {
    const start = shownRef.current;
    if (start === value) return;
    if (reducedMotion) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const next = t >= 1 ? value : Math.round(start + (value - start) * eased);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reducedMotion]);

  return (
    <span className={className} aria-live="polite">
      {format(shown)}
    </span>
  );
}
