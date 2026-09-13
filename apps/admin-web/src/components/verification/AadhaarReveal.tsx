'use client';

import { Eye } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AadhaarAccessPurpose, type KycSubmission } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Select } from '@/components/ui-kit/Select';
import { maskedAadhaar, revealAadhaar } from '@/lib/services';

const PURPOSE_OPTIONS = [
  { value: AadhaarAccessPurpose.IDENTITY_VERIFICATION, label: 'Verifying identity' },
  { value: AadhaarAccessPurpose.DISPUTE_INVESTIGATION, label: 'Investigating a dispute' },
  { value: AadhaarAccessPurpose.PAYOUT_RECONCILIATION, label: 'Reconciling a payout' },
  { value: AadhaarAccessPurpose.REGULATORY_REQUEST, label: 'Responding to a regulator' },
];

export interface AadhaarRevealProps {
  submission: KycSubmission;
  /** Called after a reveal is logged, so an access log on screen can refresh. */
  onRevealed?: () => void;
}

/**
 * The Aadhaar field: masked by default, revealed briefly, on the record.
 *
 * UIDAI Circular 14 of 2025 shapes every line of this component.
 *
 * THE FULL NUMBER NEVER ENTERS REACT STATE. Not for the thirty seconds it is shown,
 * not at all. It is written straight into one text node through a ref and wiped from
 * that node when the window ends or the component unmounts. React state only ever
 * holds the countdown and whether a reveal is showing, so there is no fiber, no
 * DevTools props panel and no re-render in which the value can be retained. Rule 1
 * bans it from React state outright; rule 3 allows it on screen for the window; a ref
 * is the one place that satisfies both.
 *
 * The order is the compliance requirement: a purpose must be chosen, the service
 * writes the audit row BEFORE it returns anything, and only then does the value
 * reach the screen. The value comes from a local variable in the click handler and
 * is dropped when the handler returns.
 */
export function AadhaarReveal({ submission, onRevealed }: AadhaarRevealProps) {
  const [purpose, setPurpose] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);

  /* The only place the full value ever lives, and only while secondsLeft > 0. */
  const valueNode = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const masked = maskedAadhaar(submission.aadhaarLast4);
  const revealed = secondsLeft > 0;

  /** Puts the masked form back and stops the clock. */
  const conceal = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = undefined;
    if (valueNode.current) valueNode.current.textContent = masked;
  }, [masked]);

  /* The window ends: wipe the node. */
  useEffect(() => {
    if (secondsLeft === 0) conceal();
  }, [secondsLeft, conceal]);

  /* Leaving the page, or switching to another submission, wipes it too. */
  useEffect(() => conceal, [conceal, submission.id]);

  async function onReveal(): Promise<void> {
    setError(undefined);
    if (!purpose) {
      setError('Choose why you need to see this number before revealing it.');
      return;
    }
    setWorking(true);
    try {
      /* The audit row is written inside this call, before it resolves. */
      const result = await revealAadhaar(submission.id, purpose as AadhaarAccessPurpose);
      if (valueNode.current) valueNode.current.textContent = result.value;
      setSecondsLeft(Math.round(result.windowMs / 1000));
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => {
        setSecondsLeft((current) => Math.max(0, current - 1));
      }, 1000);
      setPurpose('');
      onRevealed?.();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="rounded-tile border border-hairline bg-ground p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-pill text-muted">Aadhaar</p>
          {/*
           * React always renders the masked form here. Because that child never changes
           * between renders, React never rewrites this text node — so the value the ref
           * writes in stays put through each countdown tick, and is wiped by conceal().
           */}
          <p className="mt-0.5 font-mono text-table text-ink">
            <span ref={valueNode}>{masked}</span>
          </p>
          {revealed ? (
            <p className="mt-1 text-pill text-ink" role="status">
              Hidden again in <span className="tabular">{secondsLeft}</span>s. This access is logged.
            </p>
          ) : (
            <p className="mt-1 text-pill text-muted">
              Only the last four digits are kept. Every reveal is recorded in the access log.
            </p>
          )}
        </div>

        {revealed ? (
          <Button variant="ghost" size="sm" onClick={() => setSecondsLeft(0)}>
            Hide now
          </Button>
        ) : (
          <div className="flex items-end gap-2">
            <Select
              className="w-52"
              label="Why do you need this?"
              allLabel="Choose a reason"
              value={purpose}
              onChange={setPurpose}
              options={PURPOSE_OPTIONS}
            />
            <Button
              variant="outline"
              icon={<Eye size={16} strokeWidth={1.5} aria-hidden />}
              onClick={onReveal}
              disabled={working}
              className="mb-0.5"
            >
              Reveal number
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-pill text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
