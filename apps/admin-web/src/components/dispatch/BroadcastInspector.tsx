'use client';

import { Check, Radio, Smartphone, X } from 'lucide-react';
import { Avatar } from '@/components/ui-kit/Avatar';
import { Button } from '@/components/ui-kit/Button';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count, percent, rupees } from '@/lib/format';
import { rankingExplanation, type Broadcast, type EquityWeights, type RankedCandidate } from '@/lib/services';
import { cn } from '@/lib/utils';

/** The three inputs as stacked mini-bars, so the weighting is visible not asserted. */
function ScoreBars({ candidate, weights }: { candidate: RankedCandidate; weights: EquityWeights }) {
  const rows = [
    { label: 'Close by', value: candidate.inputs.proximity, weight: weights.proximity },
    { label: 'Rated well', value: candidate.inputs.rating, weight: weights.rating },
    {
      label: 'Had less work',
      value: candidate.inputs.inverseAllocation,
      weight: weights.inverseAllocation,
    },
  ];

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center gap-2">
          <span className="w-20 flex-none text-[11px] text-muted">{row.label}</span>
          <span className="h-1 flex-1 overflow-hidden rounded-pill bg-hairline/70">
            <span
              className="block h-full rounded-pill bg-marigold"
              style={{ width: `${row.value * 100}%` }}
            />
          </span>
          <span className="tabular w-16 flex-none text-right text-[11px] text-muted">
            {percent(row.value)} × {percent(row.weight)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface BroadcastInspectorProps {
  broadcast?: Broadcast;
  loading: boolean;
  zoneName: string;
  onClose: () => void;
  onReassign: (workerId: string) => void;
  busy?: boolean;
}

/**
 * The Broadcast Inspector: why the dispatcher offered this job to whom.
 *
 * This is the transparency feature, and it is the reason the ranking is recomputed
 * live from the same function the dispatcher uses rather than read from a stored
 * list. Every row shows the three inputs, their weights and the score they produce,
 * so the claim can be checked on screen instead of believed.
 *
 * The plain-language line at the bottom names the actual reason the top-ranked
 * worker won, using their actual job count against their zone's actual average.
 */
export function BroadcastInspector({
  broadcast,
  loading,
  zoneName,
  onClose,
  onReassign,
  busy = false,
}: BroadcastInspectorProps) {
  const top = broadcast?.candidates[0];

  return (
    <aside
      role="dialog"
      aria-label="Broadcast inspector"
      className="flex h-full w-[480px] flex-none flex-col border-l border-hairline bg-surface"
    >
      <div className="flex flex-none items-start justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-card-title font-medium text-ink">
            Why this job went where it did
          </h2>
          <p className="mt-0.5 text-pill text-muted">
            {broadcast
              ? `${broadcast.booking.reference} · ${zoneName}`
              : 'Working out the ranking'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<X size={16} strokeWidth={1.5} aria-hidden />}
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      <div className="scroll-hidden flex-1 overflow-y-auto px-5 py-4">
        {loading || !broadcast ? (
          <Skeleton lines={10} />
        ) : (
          <>
            {/* The job, the customer, and where the money would go. */}
            <dl className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-table text-muted">Customer</dt>
                <dd className="text-table text-ink">{broadcast.booking.customerName}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-table text-muted">Job</dt>
                <dd className="text-table text-ink">{broadcast.booking.category}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-table text-muted">Customer pays</dt>
                <dd className="tabular font-display text-card-title font-medium text-ink">
                  {rupees(broadcast.booking.amount)}
                </dd>
              </div>
            </dl>

            {/*
             * The split preview. Shares are the ones currently set in Settings, so this
             * shows what the booking will actually pay out, not an illustration.
             */}
            <ul className="mt-3 flex flex-col gap-1 rounded-tile border border-hairline bg-ground p-3">
              {[
                {
                  label: 'To the worker',
                  share: broadcast.shares.worker,
                  tone: 'text-ink',
                },
                {
                  label: 'To run the platform',
                  share: broadcast.shares.platform,
                  tone: 'text-muted',
                },
                {
                  label: 'To the cooperative fund',
                  share: broadcast.shares.coopFund,
                  tone: 'text-fund-green',
                },
              ].map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-pill text-muted">
                    {row.label} ({percent(row.share)})
                  </span>
                  <span className={cn('tabular text-table', row.tone)}>
                    {rupees(Math.round(broadcast.booking.amount * row.share))}
                  </span>
                </li>
              ))}
            </ul>

            {broadcast.live ? (
              <LiveDispatchSummary broadcast={broadcast} />
            ) : (
              <p className="mt-4 text-table text-muted">
                Offered to{' '}
                <span className="tabular text-ink">{count(broadcast.candidates.length)}</span>{' '}
                workers within{' '}
                <span className="tabular text-ink">{broadcast.radiusKm}km</span>, ranked by equity
                score. Each offer stays open for{' '}
                <span className="tabular text-ink">{broadcast.pingTimeoutSeconds} seconds</span>.
              </p>
            )}

            <ol className="mt-3 flex flex-col gap-2">
              {broadcast.candidates.map((candidate) => (
                <li
                  key={candidate.worker.id}
                  className={cn(
                    'rounded-tile border border-hairline bg-surface p-3',
                    /* The accepting worker gets a fund-green left edge. */
                    candidate.accepted && 'border-l-2 border-l-fund-green',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="tabular w-4 flex-none pt-1.5 text-pill text-muted">
                      {candidate.rank}
                    </span>
                    <Avatar
                      name={candidate.worker.name}
                      src={candidate.worker.avatarUrl}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex items-center gap-1.5 truncate text-table font-medium text-ink">
                          {candidate.worker.name}
                          {broadcast.live?.connectedIds.includes(candidate.worker.id) ? (
                            <span title="Had the worker app open when the offer went out" className="inline-flex items-center text-muted">
                              <Smartphone size={12} strokeWidth={1.75} aria-label="App open" />
                            </span>
                          ) : null}
                          {broadcast.live?.offeredIds.includes(candidate.worker.id) && !candidate.accepted ? (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-marigold-tint px-1.5 py-0.5 text-[11px] font-medium text-ink">
                              Offered
                            </span>
                          ) : null}
                          {candidate.accepted ? (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-fund-green/15 px-1.5 py-0.5 text-[11px] font-medium text-fund-green">
                              <Check size={11} strokeWidth={2} aria-hidden />
                              Took it
                            </span>
                          ) : null}
                        </span>
                        <span className="tabular flex-none text-table text-ink">
                          {candidate.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-pill text-muted">
                        <span className="tabular">{candidate.distanceKm}km</span> away ·{' '}
                        <span className="tabular">{candidate.worker.rating.toFixed(1)}</span> rated
                        ·{' '}
                        <span className="tabular">{count(candidate.worker.jobsThisWeek)}</span> jobs
                        this week
                      </p>
                      <ScoreBars candidate={candidate} weights={broadcast.weights} />
                    </div>
                  </div>

                  {candidate.accepted ? null : (
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onReassign(candidate.worker.id)}
                        disabled={busy}
                      >
                        Hand the job to {candidate.worker.name.split(' ')[0]}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>

            {/*
             * The claim, in plain language and with the real numbers behind it. This
             * sentence is the whole argument for the platform's dispatcher, so it
             * quotes the worker's own count against their zone's own average rather
             * than generalising.
             */}
            {top ? (
              <p className="mt-4 rounded-tile border border-hairline bg-marigold-tint/40 p-3 text-table text-ink">
                {rankingExplanation(broadcast, zoneName)}
              </p>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * What the backend actually did with this booking: offered at once to the top of the
 * ranking, who had the app open, and how it ended — with the time it took.
 */
function LiveDispatchSummary({ broadcast }: { broadcast: Broadcast }) {
  const live = broadcast.live!;
  const seconds = live.elapsedMs === undefined ? undefined : (live.elapsedMs / 1000).toFixed(1);
  /* A booked-ahead request can sit for hours, where "9,412.6 seconds" says nothing. */
  const took =
    live.elapsedMs !== undefined && live.elapsedMs >= 120_000 ? `${Math.round(live.elapsedMs / 60_000)} minutes` : `${seconds} seconds`;
  return (
    <div className="mt-4 rounded-tile border border-hairline bg-ground p-3">
      <p className="flex items-center gap-2 text-table font-medium text-ink">
        <Radio size={14} strokeWidth={1.75} aria-hidden className="text-marigold" />
        {live.scheduledFor ? 'Booked ahead' : 'Live dispatch'}
        {live.rounds > 1 ? `, round ${live.round} of ${live.rounds}` : ''}
      </p>
      {live.scheduledFor ? (
        <p className="mt-1 text-table text-muted">
          For{' '}
          <span className="text-ink">
            {new Date(live.scheduledFor).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
          </span>
          . It waits in every matching worker&rsquo;s Scheduled requests list until then, rather than ringing for thirty seconds.
        </p>
      ) : null}
      <p className="mt-1 text-table text-muted">
        Offered to <span className="tabular text-ink">{count(live.offeredIds.length)}</span> workers at once within{' '}
        <span className="tabular text-ink">{broadcast.radiusKm}km</span>
        {live.belowLine > 0 ? (
          <>
            , with <span className="tabular text-ink">{count(live.belowLine)}</span> more ranked below the line
          </>
        ) : null}
        . <span className="tabular text-ink">{count(live.connectedIds.filter((id) => live.offeredIds.includes(id)).length)}</span> had the app
        open.{' '}
        {live.scheduledFor ? null : (
          <>
            Each offer stayed open <span className="tabular text-ink">{broadcast.pingTimeoutSeconds} seconds</span>.
          </>
        )}
      </p>
      <p className="mt-2 text-table">
        {live.outcome === 'ACCEPTED' ? (
          <span className="text-fund-green">
            {live.acceptedBy} took it <span className="tabular">{took}</span> after the request.
          </span>
        ) : live.outcome === 'EXPIRED' ? (
          <span className="text-coral">
            Nobody took it. It expired after <span className="tabular">{took}</span>
            {live.scheduledFor ? ', when the slot came round' : ''}.
          </span>
        ) : live.outcome === 'WITHDRAWN' ? (
          <span className="text-muted">The customer cancelled while it was being offered.</span>
        ) : (
          <span className="text-muted">Waiting for someone to accept.</span>
        )}
      </p>
    </div>
  );
}
