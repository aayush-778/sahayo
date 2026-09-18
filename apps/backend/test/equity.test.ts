import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { KycStatus, type AdminWorker } from '@sahayo/shared';
import { rankCandidates } from '../src/dispatch/ranking';

/** A member with just the fields ranking reads. */
function member(id: string, name: string, rating: number, jobsThisWeek: number): AdminWorker {
  return {
    id,
    name,
    rating,
    jobsThisWeek,
    avatarUrl: 'https://i.pravatar.cc/160?img=1',
    category: 'ELECTRICIAN',
    serviceCategoryIds: ['cat_electricians'],
    zoneId: 'zone-rajendra-nagar',
    location: { lat: 25.6, lng: 85.15 },
    phone: '+91 90000 00000',
    ratingCount: 100,
    kycStatus: KycStatus.VERIFIED,
    isOnline: true,
    isOnJob: false,
    lifetimeJobs: 300,
    walletBalance: 0,
    fundContributed: 0,
    lifetimeEarnings: 0,
    joinedAt: '2025-01-01T00:00:00.000Z',
    equityScore: 0,
    equityInputs: { proximity: 0, rating: 0, inverseAllocation: 0 },
    weeklyJobHistory: Array(12).fill(jobsThisWeek),
    completionRate: 1,
  };
}

describe('equity ranking', () => {
  test('THE COOPERATIVE CLAIM: a lower-rated worker with fewer jobs this week outranks a saturated top-rated worker', () => {
    const saturatedStar = member('w_star', 'Top-rated, fully booked', 5.0, 19);
    const quietMember = member('w_quiet', 'Lower-rated, quiet week', 4.0, 1);

    const ranked = rankCandidates(
      [
        /* The star is nearer, too: every advantage a rating-first or nearest-first dispatcher would reward. */
        { worker: saturatedStar, distanceM: 800 },
        { worker: quietMember, distanceM: 1_500 },
      ],
      { radiusM: 5_000, maxJobsThisWeek: 19 },
    );

    assert.equal(ranked[0]!.worker.id, 'w_quiet', 'the quiet member must be offered the job first');
    assert.ok(ranked[0]!.score > ranked[1]!.score);
    assert.ok(saturatedStar.rating > quietMember.rating, 'the winner really does have the lower rating');
    assert.ok(ranked[1]!.distanceM < ranked[0]!.distanceM, 'the winner really is further away');
  });

  test('with equal work this week, the nearer and better-rated worker ranks first', () => {
    const ranked = rankCandidates(
      [
        { worker: member('w_far', 'Far', 4.0, 5), distanceM: 4_000 },
        { worker: member('w_near', 'Near', 4.8, 5), distanceM: 500 },
      ],
      { radiusM: 5_000, maxJobsThisWeek: 19 },
    );
    assert.deepEqual(ranked.map((candidate) => candidate.worker.id), ['w_near', 'w_far']);
  });

  test('the score is exactly the weighted sum of the three inputs, and ranks are 1-based', () => {
    const [only] = rankCandidates([{ worker: member('w', 'Only', 4.3, 0), distanceM: 2_500 }], { radiusM: 5_000, maxJobsThisWeek: 10 });
    assert.deepEqual(only!.inputs, { proximity: 0.5, rating: 0.5, inverseAllocation: 1 });
    assert.equal(only!.score, Math.round((0.5 * 0.3 + 0.5 * 0.25 + 1 * 0.45) * 1000) / 1000);
    assert.equal(only!.rank, 1);
  });
});
