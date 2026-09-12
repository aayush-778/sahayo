'use client';

import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { count, percent } from '@/lib/format';
import type { CategorySlice } from '@/lib/services';
import { DONUT_SEGMENTS, SURFACE } from './chart-theme';

/**
 * Hiring by category, as a donut.
 *
 * A donut rather than a pie, and five slices plus Other rather than eight: past
 * about five slices the reader stops comparing angles and starts reading the
 * legend, at which point the chart is decoration. The hollow centre earns its
 * keep by holding the total.
 */
export function CategoryDonut({ slices }: { slices?: CategorySlice[] }) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>();

  if (!slices) {
    return (
      <Card className="col-span-12 p-6 lg:col-span-4">
        <Skeleton lines={6} />
      </Card>
    );
  }

  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const summary = slices
    .map((slice) => `${slice.label} ${slice.count} jobs, ${percent(slice.share)}`)
    .join('; ');

  return (
    <Card className="col-span-12 flex flex-col p-6 lg:col-span-4">
      <SectionHeader title="Hiring by category" subtitle="Which trades are being booked" />

      <div className="relative mt-4 h-44">
        {/*
         * The chart is decorative for assistive technology: the legend below
         * carries every figure as text, so announcing the SVG too would just
         * repeat it. The accessible summary lives on the figure.
         */}
        <figure
          className="h-full"
          aria-label={`Hiring by category, ${count(total)} jobs this quarter. ${summary}`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="count"
                nameKey="label"
                innerRadius="64%"
                outerRadius="100%"
                /* A surface-coloured stroke reads as a gap, not as an outline. */
                stroke={SURFACE}
                strokeWidth={3}
                startAngle={90}
                endAngle={-270}
                isAnimationActive={false}
                onMouseEnter={(_, index: number) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(undefined)}
              >
                {slices.map((slice, index) => (
                  <Cell
                    key={slice.category}
                    fill={DONUT_SEGMENTS[index % DONUT_SEGMENTS.length]}
                    /* Hovering one segment dims the rest to 40%. */
                    opacity={activeIndex === undefined || activeIndex === index ? 1 : 0.4}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </figure>

        {/* The centre label. Absolutely positioned so the donut stays responsive. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular font-display text-stat font-medium text-ink">
            {count(total)}
          </span>
          <span className="text-pill text-muted">this quarter</span>
        </div>
      </div>

      {/*
       * A written legend below, in two columns — not a floating chart legend.
       * Every slice carries its name, count and share, so the donut never
       * communicates by colour alone. Each row is focusable, which is how the
       * chart becomes keyboard-reachable at all.
       */}
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
        {slices.map((slice, index) => (
          <li key={slice.category}>
            <button
              type="button"
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(undefined)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              className="flex w-full items-baseline gap-2 rounded-sm text-left text-pill"
            >
              <span
                aria-hidden
                className="mt-1 h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: DONUT_SEGMENTS[index % DONUT_SEGMENTS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-ink">{slice.label}</span>
              <span className="tabular text-muted">{count(slice.count)}</span>
              <span className="tabular w-9 text-right text-muted">{percent(slice.share)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
