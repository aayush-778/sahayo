import { Briefcase, CheckCheck, Star } from 'lucide-react';
import type { AdminWorker } from '@sahayo/shared';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { StatBlock } from '@/components/ui-kit/StatBlock';
import { count, percent } from '@/lib/format';
import type { EquityWeights } from '@/lib/services';

/** Twelve weekly counts as a sparkline. */
function JobsSparkline({ history }: { history: number[] }) {
  const max = Math.max(1, ...history);
  const step = 100 / Math.max(1, history.length - 1);
  const points = history
    .map((value, index) => `${index * step},${30 - (value / max) * 28}`)
    .join(' ');

  return (
    <figure
      aria-label={`Jobs per week over the last twelve weeks: ${history.join(', ')}`}
      className="mt-3"
    >
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-12 w-full">
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--marigold))"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      <figcaption className="mt-1 flex justify-between text-pill text-muted">
        <span>12 weeks ago</span>
        <span>This week</span>
      </figcaption>
    </figure>
  );
}

/** One input of the equity score, as a labelled bar. */
function EquityInputBar({
  label,
  value,
  weight,
  explanation,
}: {
  label: string;
  value: number;
  weight: number;
  explanation: string;
}) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-table text-ink">{label}</span>
        <span className="text-pill text-muted">
          <span className="tabular text-ink">{percent(value)}</span> at{' '}
          <span className="tabular">{percent(weight)}</span> weight
        </span>
      </div>
      <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-pill bg-hairline/70">
        <span
          className="block h-full rounded-pill bg-marigold"
          style={{ width: `${value * 100}%` }}
        />
      </span>
      <p className="mt-1 text-pill text-muted">{explanation}</p>
    </li>
  );
}

/**
 * The Overview tab.
 *
 * The equity explainer is the point of this tab, and of the platform's central
 * claim. It shows the three actual inputs with their actual weights and the score
 * they produce, rather than asserting that dispatch is fair. The weights are the
 * ones currently set in Settings, which the dispatcher itself reads, so the card
 * cannot describe a formula the system is not using.
 */
export function OverviewTab({ worker, weights }: { worker: AdminWorker; weights: EquityWeights }) {
  const { equityInputs: inputs } = worker;

  return (
    <div className="flex flex-col gap-5">
      <Card className="grid grid-cols-1 divide-y divide-hairline p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <StatBlock
            label="Jobs this week"
            value={count(worker.jobsThisWeek)}
            icon={Briefcase}
            tint="marigold"
          />
        </div>
        <div className="p-5">
          <StatBlock
            label="Jobs finished"
            value={percent(worker.completionRate)}
            icon={CheckCheck}
            tint="fund-green"
          />
        </div>
        <div className="p-5">
          <StatBlock
            label="Average rating"
            value={worker.rating.toFixed(1)}
            icon={Star}
            tint="lavender"
            note={`from ${count(worker.ratingCount)}`}
          />
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader
          title="Jobs per week"
          subtitle="The last twelve weeks, ending with this one"
        />
        <JobsSparkline history={worker.weeklyJobHistory} />
      </Card>

      <Card className="p-6">
        <SectionHeader
          title="Why dispatch ranks this worker where it does"
          subtitle="These are the actual inputs, with the actual weights the dispatcher uses"
        />

        <ul className="mt-5 flex flex-col gap-4">
          <EquityInputBar
            label="How close they are"
            value={inputs.proximity}
            weight={weights.proximity}
            explanation="Distance from the job, measured against the broadcast radius."
          />
          <EquityInputBar
            label="How they are rated"
            value={inputs.rating}
            weight={weights.rating}
            explanation="Customer rating, scaled across the range workers actually sit in."
          />
          <EquityInputBar
            label="How little work they have had"
            value={inputs.inverseAllocation}
            weight={weights.inverseAllocation}
            explanation="Fewer jobs this week scores higher, which is how earnings are kept from piling up with whoever happens to be nearest."
          />
        </ul>

        <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
          <span className="text-table text-muted">Resulting score</span>
          <span className="tabular font-display text-stat font-medium text-ink">
            {worker.equityScore.toFixed(3)}
          </span>
        </div>
      </Card>
    </div>
  );
}
