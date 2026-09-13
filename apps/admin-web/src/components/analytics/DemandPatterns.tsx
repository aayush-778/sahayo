'use client';

import { demandColor } from '@/components/dashboard/chart-theme';
import { Card } from '@/components/ui-kit/Card';
import { DeltaPill } from '@/components/ui-kit/DeltaPill';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { count, percent, rupees } from '@/lib/format';
import type { CategoryPerformance } from '@/lib/services';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** Service hours only; the grid does not draw the night, when nothing is booked. */
const FIRST_HOUR = 7;
const LAST_HOUR = 20;

function hourLabel(hour: number): string {
  const suffix = hour < 12 ? 'am' : 'pm';
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}${suffix}`;
}

/** When jobs are booked: weekday by hour, in India Standard Time. */
export function DemandHeatGrid({
  grid,
  peak,
  periodLabel,
}: {
  grid: number[][];
  peak: { weekday: number; hour: number; bookings: number };
  periodLabel: string;
}) {
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, index) => FIRST_HOUR + index);
  const max = Math.max(1, ...grid.flat());

  return (
    <Card className="col-span-12 p-6 lg:col-span-8">
      <SectionHeader
        title="When jobs are booked"
        subtitle={`Every booking ${periodLabel}, by day of the week and hour, India Standard Time`}
      />
      <p className="mt-3 text-table text-ink">
        The busiest hour is {WEEKDAYS[peak.weekday]} at {hourLabel(peak.hour)}, with{' '}
        <span className="tabular">{count(peak.bookings)}</span> bookings. Put more workers online before then.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
          <caption className="sr-only">
            Bookings by weekday and hour. {WEEKDAYS.map((day, index) => `${day}: ${hours.map((hour) => grid[index]?.[hour] ?? 0).join(', ')}`).join('. ')}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-10" />
              {hours.map((hour) => (
                <th key={hour} scope="col" className="pb-1 text-center text-[11px] font-normal text-muted">
                  {hour % 2 === 1 ? hourLabel(hour) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day, weekday) => (
              <tr key={day}>
                <th scope="row" className="pr-2 text-left text-pill font-normal text-muted">
                  {day.slice(0, 3)}
                </th>
                {hours.map((hour) => {
                  const value = grid[weekday]?.[hour] ?? 0;
                  return (
                    <td
                      key={hour}
                      title={`${day} ${hourLabel(hour)}: ${value} bookings`}
                      className="h-7 min-w-[1.5rem] rounded-[5px]"
                      style={{ backgroundColor: value === 0 ? 'hsl(var(--hairline) / 0.6)' : demandColor(value / max) }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-pill text-muted">Quiet</span>
        <span
          aria-hidden
          className="h-1.5 w-40 rounded-pill"
          style={{ backgroundImage: `linear-gradient(90deg, ${demandColor(0)}, ${demandColor(0.5)}, ${demandColor(1)})` }}
        />
        <span className="text-pill text-muted">Busiest</span>
      </div>
    </Card>
  );
}

/** Each trade's bookings, how often jobs finish, and the change on the previous period. */
export function TradePerformance({
  categories,
  comparisonLabel,
}: {
  categories: CategoryPerformance[];
  /** e.g. "vs the 30 days before". Absent when there is no earlier period to compare. */
  comparisonLabel?: string;
}) {
  return (
    <Card className="col-span-12 p-6 lg:col-span-4">
      <SectionHeader
        title="Trades"
        subtitle={comparisonLabel ? `Bookings ${comparisonLabel}` : 'The records do not reach back far enough to compare'}
      />
      <ul className="mt-4 flex flex-col divide-y divide-hairline">
        {categories.map((category) => (
          <li key={category.label} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-table font-medium text-ink">{category.label}</span>
              <span className="flex items-center gap-2">
                <span className="tabular text-table text-ink">{count(category.bookings)}</span>
                {category.deltaPercent !== undefined ? <DeltaPill value={category.deltaPercent} /> : null}
              </span>
            </div>
            <p className="mt-0.5 text-pill text-muted">
              <span className="tabular">{percent(category.finishRate)}</span> finished · average{' '}
              <span className="tabular">{rupees(category.averageValue)}</span>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
