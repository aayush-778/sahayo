import { cn } from '@/lib/utils';
import { TINT_PILL, type Tint } from './tint';

export const STATUS_VARIANTS = [
  'pending',
  'verified',
  'rejected',
  'active',
  'offline',
  'resolved',
] as const;

export type StatusVariant = (typeof STATUS_VARIANTS)[number];

/**
 * Each variant carries both a tint and a word. A pill never communicates by
 * colour alone, so the label is not optional.
 */
const STATUS: Record<StatusVariant, { label: string; tint: Tint }> = {
  pending: { label: 'Pending', tint: 'marigold' },
  verified: { label: 'Verified', tint: 'fund-green' },
  rejected: { label: 'Rejected', tint: 'coral' },
  active: { label: 'Active', tint: 'fund-green' },
  offline: { label: 'Offline', tint: 'muted' },
  resolved: { label: 'Resolved', tint: 'lavender' },
};

export interface StatusPillProps {
  status: StatusVariant;
  /** Overrides the default word where the domain uses a different one. */
  label?: string;
  className?: string;
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const variant = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-1 text-pill font-semibold',
        TINT_PILL[variant.tint],
        className,
      )}
    >
      {label ?? variant.label}
    </span>
  );
}
