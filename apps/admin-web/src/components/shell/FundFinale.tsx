'use client';

import { HandCoins, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui-kit/Button';
import { CountUp } from '@/components/ui-kit/CountUp';
import { IconTile } from '@/components/ui-kit/IconTile';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { rupees } from '@/lib/format';
import { dismissFundFinale, useFundFinale } from '@/lib/services';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { cn } from '@/lib/utils';

/** How long the card stays up on its own. Long enough to say it out loud on stage. */
const SHOW_MS = 16_000;
/** The gap between each share appearing, so the three are read one at a time. */
const STAGGER_MS = 450;

/**
 * The last beat of the demo: a job finishes and its money arrives.
 *
 * Wherever the administrator is in the portal, a card rises from the bottom of the
 * screen: the booking that finished, its three shares appearing one after another, and
 * then the cooperative fund's total climbing to its new balance. It is the moment the
 * platform shows it is a cooperative and not a gig app, so it is not a toast in a corner.
 *
 * It stays up for sixteen seconds, or until closed.
 */
export function FundFinale() {
  const finale = useFundFinale();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!finale) return;
    setStep(reducedMotion ? 4 : 0);
    const timers = reducedMotion ? [] : [1, 2, 3, 4].map((n) => setTimeout(() => setStep(n), n * STAGGER_MS));
    const close = setTimeout(dismissFundFinale, SHOW_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(close);
    };
  }, [finale, reducedMotion]);

  if (!finale) return null;

  const rows = [
    { label: finale.workerName ? `To ${finale.workerName}` : 'To the worker', amount: finale.workerShare, tone: 'text-ink' },
    { label: 'To run the platform', amount: finale.platformShare, tone: 'text-muted' },
    { label: 'To the cooperative fund', amount: finale.fundShare, tone: 'text-fund-green' },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4" role="status" aria-live="assertive">
      <div
        key={finale.id}
        className={cn(
          'pointer-events-auto w-full max-w-[520px] rounded-card border-2 border-fund-green bg-surface p-6 shadow-card',
          !reducedMotion && 'animate-in fade-in slide-in-from-bottom-6 duration-500',
        )}
      >
        <div className="flex items-start gap-4">
          <IconTile icon={HandCoins} tint="fund-green" />
          <div className="min-w-0 flex-1">
            <p className="text-pill text-muted">{finale.reference ? `${finale.reference} is done` : 'A job is done'}</p>
            <p className="font-display text-card-title font-medium text-ink">
              {rupees(finale.gross)} split three ways, to the paisa
            </p>
          </div>
          <Button variant="ghost" size="sm" icon={<X size={16} strokeWidth={1.5} aria-hidden />} onClick={dismissFundFinale}>
            Close
          </Button>
        </div>

        <ul className="mt-4 flex flex-col gap-1.5 rounded-tile border border-hairline bg-ground p-3">
          {rows.map((row, index) => (
            <li
              key={row.label}
              className={cn(
                'flex items-baseline justify-between gap-3 transition-all duration-300',
                step > index ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0',
              )}
            >
              <span className="text-table text-muted">{row.label}</span>
              <span className={cn('tabular text-table font-medium', row.tone)}>
                {index === 2 ? '+' : ''}
                {rupees(row.amount)}
              </span>
            </li>
          ))}
        </ul>

        <div className={cn('mt-5 transition-opacity duration-500', step >= 4 ? 'opacity-100' : 'opacity-0')}>
          <p className="text-table text-muted">The cooperative fund now holds</p>
          <CountUp
            value={step >= 4 ? finale.fundAfter : finale.fundBefore}
            from={finale.fundBefore}
            durationMs={2400}
            format={rupees}
            className="tabular block font-display text-hero font-medium text-fund-green"
          />
          <p className="mt-1 text-table text-ink">
            Owned by the members who did the work, and spent the way they vote.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/finance">See the three rows in Finance</LinkButton>
          <LinkButton href="/fund">Open the fund</LinkButton>
        </div>
      </div>
    </div>
  );
}
