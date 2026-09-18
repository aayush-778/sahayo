import {
  DEFAULT_EQUITY_WEIGHTS,
  computeEquityScore,
  equityInputsFor,
  type EquityScoreInputs,
  type EquityWeights,
} from '@sahayo/shared';
import type { Candidate } from '../repositories/workers';

/** A candidate with the arithmetic that placed them: three inputs, the weighted total, and their place. */
export interface RankedCandidate extends Candidate {
  inputs: EquityScoreInputs;
  score: number;
  rank: number;
}

export interface RankingContext {
  /** The broadcast radius the proximity input is normalised against. */
  radiusM: number;
  /** The busiest member's jobs this week, which the inverse-allocation input is scaled against. */
  maxJobsThisWeek: number;
  weights?: EquityWeights;
}

/**
 * Orders candidates by equity score, highest first.
 *
 *   score = proximity × 0.30 + rating × 0.25 + inverseAllocation × 0.45
 *
 * (the weights in constants.ts, which administrators can change in Settings). Not by
 * distance, and not by rating: inverseAllocation — fewer jobs this week scores higher —
 * carries the most weight, so a quiet member is offered work ahead of a busy one who is
 * nearer or better reviewed. Ties go to the nearer worker, then to the lower id, so the
 * order is always the same for the same inputs.
 */
export function rankCandidates(candidates: Candidate[], context: RankingContext): RankedCandidate[] {
  const weights = context.weights ?? DEFAULT_EQUITY_WEIGHTS;
  return candidates
    .map((candidate) => {
      const inputs = equityInputsFor({
        distanceM: candidate.distanceM,
        radiusM: context.radiusM,
        rating: candidate.worker.rating,
        jobsThisWeek: candidate.worker.jobsThisWeek,
        maxJobsThisWeek: context.maxJobsThisWeek,
      });
      return { ...candidate, inputs, score: computeEquityScore(inputs, weights), rank: 0 };
    })
    .sort((a, b) => b.score - a.score || a.distanceM - b.distanceM || (a.worker.id < b.worker.id ? -1 : 1))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}
