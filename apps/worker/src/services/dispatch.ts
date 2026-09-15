import { useMemo } from 'react';

import { useSessionStore } from '../store/session';

/**
 * How job offers are shared out — made legible to the worker it protects.
 *
 * The offer order weighs three things: distance to the customer, the member's
 * fair share of work this week, and their rating. Fair share is the
 * anti-exploitation rule: a member who has had fewer jobs this week moves up
 * the list whatever their rating, so a lower rating can slow work but never
 * stop it.
 *
 * NOT YET ENFORCED ANYWHERE. There is no dispatcher until Phase 5; these are
 * the rules the Phase 5 dispatcher must implement, stated once here so the
 * screen explaining them and the server applying them cannot drift apart.
 */

/** Jobs a member completes in an average week. Phase 5 reads it from the server. */
export const MEMBER_WEEKLY_AVERAGE_JOBS = 9;

export type WeekStanding = 'fewer' | 'about' | 'more';

export interface WeekFairness {
  jobsThisWeek: number;
  memberAverage: number;
  standing: WeekStanding;
}

/** Monday 00:00 of this week, local time. */
function startOfWeek(now: Date): number {
  const sinceMonday = (now.getDay() + 6) % 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday).getTime();
}

export function standingFor(jobs: number, average: number): WeekStanding {
  if (jobs < average * 0.8) return 'fewer';
  if (jobs > average * 1.2) return 'more';
  return 'about';
}

/** Finished jobs since Monday against the member average. */
export function useWeekFairness(): WeekFairness {
  const earnings = useSessionStore((state) => state.earnings);
  return useMemo(() => {
    const since = startOfWeek(new Date());
    const jobsThisWeek = earnings.filter((entry) => new Date(entry.createdAt).getTime() >= since).length;
    return {
      jobsThisWeek,
      memberAverage: MEMBER_WEEKLY_AVERAGE_JOBS,
      standing: standingFor(jobsThisWeek, MEMBER_WEEKLY_AVERAGE_JOBS),
    };
  }, [earnings]);
}
