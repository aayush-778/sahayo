import { EQUITY_WEIGHT_INVERSE_ALLOCATION, EQUITY_WEIGHT_PROXIMITY, EQUITY_WEIGHT_RATING } from './constants';
import type { EquityScoreInputs } from './types/worker';

/**
 * The equity dispatcher's arithmetic: how a worker's distance, rating and share of
 * this week's work combine into the score a request is offered in order of.
 *
 * One definition, used by the backend's dispatcher, the admin portal's Broadcast
 * Inspector and the seed. The inspector's claim — "ranked first for taking fewer jobs"
 * — is only true while the number it shows is the number the dispatcher used.
 */

/** The three dispatch weights as fractions summing to 1. */
export interface EquityWeights {
  proximity: number;
  rating: number;
  inverseAllocation: number;
}

/**
 * The weights the cooperative launched with, from constants.ts. Administrators can
 * change them in Settings; a reset restores these exactly.
 */
export const DEFAULT_EQUITY_WEIGHTS: EquityWeights = {
  proximity: EQUITY_WEIGHT_PROXIMITY,
  rating: EQUITY_WEIGHT_RATING,
  inverseAllocation: EQUITY_WEIGHT_INVERSE_ALLOCATION,
};

/** The lowest rating a member can hold and stay on the platform, which the rating input is scaled from. */
export const RATING_FLOOR = 3.6;
/** The highest rating there is. */
export const RATING_CEILING = 5;

const round3 = (value: number): number => Math.round(value * 1000) / 1000;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * A worker's three equity inputs for one request, each normalised to 0–1.
 *
 * - proximity: 1 at the customer's door, 0 at the edge of the broadcast radius.
 * - rating: 0 at RATING_FLOOR, 1 at a perfect 5.
 * - inverseAllocation: 1 for a worker with no jobs this week, 0 for the busiest member.
 *   This is the anti-exploitation clause: a quiet worker scores high on it, so work
 *   does not pile up on whoever happens to be nearest or best reviewed.
 */
export function equityInputsFor({
  distanceM,
  radiusM,
  rating,
  jobsThisWeek,
  maxJobsThisWeek,
}: {
  distanceM: number;
  radiusM: number;
  rating: number;
  jobsThisWeek: number;
  maxJobsThisWeek: number;
}): EquityScoreInputs {
  return {
    proximity: round3(clamp01(1 - distanceM / radiusM)),
    rating: round3(clamp01((rating - RATING_FLOOR) / (RATING_CEILING - RATING_FLOOR))),
    inverseAllocation: round3(clamp01(1 - jobsThisWeek / Math.max(1, maxJobsThisWeek))),
  };
}

/** Combines the three inputs into the score the dispatcher ranks on, to three decimals. */
export function computeEquityScore(inputs: EquityScoreInputs, weights: EquityWeights = DEFAULT_EQUITY_WEIGHTS): number {
  const score =
    inputs.proximity * weights.proximity +
    inputs.rating * weights.rating +
    inputs.inverseAllocation * weights.inverseAllocation;
  return round3(score);
}
