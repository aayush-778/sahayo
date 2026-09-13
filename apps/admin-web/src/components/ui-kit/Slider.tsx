'use client';

import { useId, type CSSProperties, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** How the value reads beside the label, e.g. `5 km`. */
  format: (value: number) => string;
  onChange: (value: number) => void;
  /**
   * Called when the administrator lets go — pointer up, or a key press that moved the
   * value. Settings that need confirmation open their dialog here, never on every step.
   */
  onCommit?: () => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

const MOVING_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/** A native range input, so keyboard and screen-reader behaviour come from the browser. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  onCommit,
  description,
  disabled,
  className,
}: SliderProps) {
  const id = useId();

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-table font-medium text-ink">
          {label}
        </label>
        <span className="tabular font-display text-card-title font-medium text-ink">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={onCommit}
        onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => {
          if (MOVING_KEYS.has(event.key)) onCommit?.();
        }}
        style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        className="range w-full cursor-pointer rounded-pill disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex justify-between text-pill text-muted">
        <span className="tabular">{format(min)}</span>
        <span className="tabular">{format(max)}</span>
      </div>
      {description ? <p className="text-pill text-muted">{description}</p> : null}
    </div>
  );
}
