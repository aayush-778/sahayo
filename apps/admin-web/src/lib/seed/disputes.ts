import {
  DisputeAuthor,
  DisputeOrigin,
  DisputeStatus,
  type AdminBooking,
  type Dispute,
  type DisputeMessage,
} from '@sahayo/shared';
import { DAY_MS, SEED_NOW, SEEDS, createRng, isoAgo } from './rng';

export const DISPUTE_COUNT = 40;

/**
 * What customers complain about, and what workers complain about.
 *
 * Two separate lists, because the two sides of this platform have genuinely
 * different grievances. A worker does not raise a ticket about workmanship; they
 * raise one about being sent to a job that was not as described, or about a
 * customer who refused to pay. Keeping these distinct is what makes the queue's
 * symmetry read as real rather than as the same ticket with a flag flipped.
 */
const CUSTOMER_SUBJECTS: ReadonlyArray<{ subject: string; opening: string }> = [
  {
    subject: 'Work left unfinished',
    opening: 'The tap still leaks after the visit. I was told it was fixed.',
  },
  {
    subject: 'Worker arrived late',
    opening: 'The booking was for 9am and nobody arrived until almost noon.',
  },
  {
    subject: 'Charged more than quoted',
    opening: 'I was quoted one amount and charged a higher one at the end.',
  },
  {
    subject: 'Damage during the job',
    opening: 'A tile was cracked while the work was being done.',
  },
  {
    subject: 'Worker did not arrive',
    opening: 'Nobody came and nobody called. I waited the whole morning.',
  },
  {
    subject: 'Wrong service carried out',
    opening: 'I booked a deep clean and only the kitchen was done.',
  },
];

const WORKER_SUBJECTS: ReadonlyArray<{ subject: string; opening: string }> = [
  {
    subject: 'Customer refused to pay',
    opening: 'I finished the work and the customer would not complete the payment.',
  },
  {
    subject: 'Job was not as described',
    opening: 'The booking said one room. It was a full flat and took four hours.',
  },
  {
    subject: 'Unsafe working conditions',
    opening: 'There was no working light in the room and I was asked to rewire it.',
  },
  {
    subject: 'Cancelled after I arrived',
    opening: 'I travelled forty minutes and was turned away at the door.',
  },
  {
    subject: 'Payout has not arrived',
    opening: 'The job was completed nine days ago and the payment has not reached me.',
  },
  {
    subject: 'Customer was abusive',
    opening: 'I was shouted at and asked to leave partway through the work.',
  },
];

const ADMIN_REPLIES = [
  'Thank you for raising this. I have pulled up the booking timeline and will come back to you today.',
  'I can see the job record. I am checking the payment trace before we decide anything.',
  'I have asked the other party for their account of what happened.',
  'We have the details we need. A decision will follow shortly.',
] as const;

const INTERNAL_NOTES = [
  'Timeline shows the worker arrived on time. The delay was at the customer end.',
  'Payment trace confirms the payout was posted. Bank-side delay, not ours.',
  'Second complaint against this customer this quarter. Worth flagging.',
  'Worker has a clean record across 80 jobs. Giving them the benefit of the doubt.',
] as const;

/**
 * Forty dispute tickets, split close to evenly between the two origins.
 *
 * The even split is deliberate and load-bearing. On an aggregator only the
 * customer can complain; here a worker can open a ticket against a customer and
 * it is worked the same way. If the seed skewed heavily toward customers, the
 * Phase 7 queue would quietly demonstrate the opposite of the claim it makes.
 */
export function buildDisputes(bookings: AdminBooking[]): Dispute[] {
  const rng = createRng(SEEDS.disputes);

  /*
   * Only a booking with both parties attached can be disputed by either of them, and
   * only a recent one: people complain within days of a job, not months. An earlier
   * version sampled the whole 90 days and paired tickets with random ages, so a
   * complaint could arrive eighty days after the job it was about.
   */
  const ageDays = (booking: AdminBooking): number =>
    Math.floor((SEED_NOW.getTime() - new Date(booking.createdAt).getTime()) / DAY_MS);
  const disputable = bookings.filter(
    (booking) =>
      booking.workerId && booking.workerName && ageDays(booking) >= 2 && ageDays(booking) <= 38,
  );
  const subjects = rng.sample(disputable, DISPUTE_COUNT);

  return subjects.map((booking, index) => {
    /*
     * Alternating origin guarantees 20/20 rather than leaving the balance to
     * chance. A "roughly even" draw can land at 26/14, which would undercut the
     * counter the queue prints above its filter tabs.
     */
    const raisedBy = index % 2 === 0 ? DisputeOrigin.CUSTOMER : DisputeOrigin.WORKER;
    const isCustomerRaised = raisedBy === DisputeOrigin.CUSTOMER;
    const topic = rng.pick(isCustomerRaised ? CUSTOMER_SUBJECTS : WORKER_SUBJECTS);

    const status = rng.weighted(
      [DisputeStatus.OPEN, DisputeStatus.INVESTIGATING, DisputeStatus.RESOLVED],
      [30, 25, 45],
    );

    /*
     * Raised within a couple of days of the job, never before it. Jobs reach back 38
     * days, so tickets reach past the 14-day line the MSCS Amendment Act 2023 sets for
     * escalation to the Co-operative Ombudsman — Phase 7 needs real candidates.
     */
    const openedDaysAgo = Math.max(1, ageDays(booking) - rng.int(0, 2));

    const messages: DisputeMessage[] = [
      {
        id: rng.uuid(),
        author: isCustomerRaised ? DisputeAuthor.CUSTOMER : DisputeAuthor.WORKER,
        authorName: isCustomerRaised ? booking.customerName : (booking.workerName as string),
        body: topic.opening,
        internal: false,
        createdAt: isoAgo(openedDaysAgo),
      },
    ];

    if (status !== DisputeStatus.OPEN) {
      messages.push({
        id: rng.uuid(),
        author: DisputeAuthor.ADMIN,
        authorName: 'Anjali Verma',
        body: rng.pick(ADMIN_REPLIES),
        internal: false,
        createdAt: isoAgo(openedDaysAgo, 180),
      });
      messages.push({
        id: rng.uuid(),
        author: DisputeAuthor.ADMIN,
        authorName: 'Anjali Verma',
        body: rng.pick(INTERNAL_NOTES),
        internal: true,
        createdAt: isoAgo(openedDaysAgo, 200),
      });
    }

    return {
      id: rng.uuid(),
      reference: `DSP-${String(index + 1).padStart(4, '0')}`,
      bookingId: booking.id,
      raisedBy,
      status,
      subject: topic.subject,
      amountInDispute: booking.amount,
      customerId: booking.customerId,
      customerName: booking.customerName,
      workerId: booking.workerId as string,
      workerName: booking.workerName as string,
      messages,
      /*
       * Resolutions are deliberately left unset even on RESOLVED tickets. A
       * resolution carries the ledger entry ids it created, and those entries do
       * not exist in the seed — inventing ids that point at nothing would break
       * the one claim the resolution card makes. Phase 7 writes real resolutions
       * through the service layer, which appends the entries first.
       */
      createdAt: isoAgo(openedDaysAgo),
      updatedAt: isoAgo(openedDaysAgo, status === DisputeStatus.OPEN ? 0 : 200),
    } satisfies Dispute;
  });
}
