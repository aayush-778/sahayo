import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count } from '@/lib/format';
import type { CategoryJobCount } from '@/lib/services';

/**
 * Jobs taken this week, by trade.
 *
 * A bar composition rather than a table or a chart library: eight rows of a
 * length and a number need no axes, and a reader compares bar lengths faster than
 * they read a column of figures. Bars are drawn relative to the busiest trade, so
 * a length means "compared with the busiest", not against an arbitrary ceiling.
 */
export function JobsDistribution({ categories }: { categories?: CategoryJobCount[] }) {
  const max = (categories ?? []).reduce((m, row) => Math.max(m, row.jobs), 1);

  return (
    <Card className="col-span-12 p-6">
      <SectionHeader
        title="Jobs distributed this week"
        subtitle="Dispatch offers work to members who have had fewer jobs first, so earnings do not pile up with whoever happens to be nearest"
      />

      {!categories ? (
        <div className="mt-5">
          <Skeleton lines={8} />
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-2.5">
          {categories.map((row) => (
            <li key={row.category} className="flex items-center gap-4">
              <span className="w-24 flex-none text-table text-muted">{row.label}</span>
              <span
                className="h-2 flex-1 overflow-hidden rounded-pill bg-hairline/60"
                role="img"
                aria-label={`${row.label}: ${row.jobs} jobs this week`}
              >
                <span
                  className="block h-full rounded-pill bg-marigold"
                  style={{ width: `${(row.jobs / max) * 100}%` }}
                />
              </span>
              <span className="tabular w-12 flex-none text-right text-table text-ink">
                {count(row.jobs)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
