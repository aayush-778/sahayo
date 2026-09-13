import type { TeamMember } from '@sahayo/shared';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { adminState } from '@/lib/store';
import { compareIso } from '@/lib/dates';
import { respond } from './latency';

export interface MyActivityItem {
  id: string;
  at: string;
  /** e.g. "Verified documents", "Changed a setting". */
  category: string;
  text: string;
  href: string;
}

export interface AccountSummary {
  member: TeamMember;
  /** Everything this administrator has done, newest first. */
  activity: MyActivityItem[];
}

/**
 * The signed-in administrator's record: who they are on the team, and the trail of what
 * they have done.
 *
 * The trail is read from the records each action already writes — a verification
 * decision, an Aadhaar reveal, a resolution, a settings change — matched on the
 * administrator's id, so it is the same trail an auditor would reconstruct.
 */
export async function getAccountSummary(): Promise<AccountSummary> {
  const { team, kycQueue, aadhaarAccessLog, disputes, settingsHistory, customers, bookings, workers } = adminState();
  const me = CURRENT_ADMIN.id;
  const member =
    team.find((candidate) => candidate.id === me) ??
    ({
      id: me,
      name: CURRENT_ADMIN.name,
      role: CURRENT_ADMIN.role,
      email: '',
      permissions: '',
      joinedAt: new Date(0).toISOString(),
    } satisfies TeamMember);
  const workerName = new Map(workers.map((worker) => [worker.id, worker.name]));
  const items: MyActivityItem[] = [];

  for (const submission of kycQueue) {
    if (submission.reviewedByAdminId !== me || !submission.reviewedAt) continue;
    const name = workerName.get(submission.workerId) ?? 'a worker';
    items.push({
      id: `kyc-${submission.id}`,
      at: submission.reviewedAt,
      category: 'Verification',
      text: submission.rejectionReason ? `Rejected ${name}'s document` : `Verified ${name}'s document`,
      href: `/workers/${submission.workerId}`,
    });
  }
  for (const access of aadhaarAccessLog) {
    if (access.adminId !== me) continue;
    items.push({
      id: `aadhaar-${access.id}`,
      at: access.accessedAt,
      category: 'Aadhaar reveal',
      text: `Revealed ${workerName.get(access.workerId) ?? 'a worker'}'s Aadhaar number`,
      href: '/verification?tab=log',
    });
  }
  for (const dispute of disputes) {
    if (dispute.resolution?.resolvedByAdminId === me) {
      items.push({
        id: `resolve-${dispute.id}`,
        at: dispute.resolution.resolvedAt,
        category: 'Disputes',
        text: `Resolved ${dispute.reference}`,
        href: `/disputes?id=${dispute.id}`,
      });
    }
    if (dispute.escalation?.escalatedByAdminId === me) {
      items.push({
        id: `escalate-${dispute.id}`,
        at: dispute.escalation.escalatedAt,
        category: 'Disputes',
        text: `Referred ${dispute.reference} to the Ombudsman`,
        href: `/disputes?id=${dispute.id}`,
      });
    }
  }
  for (const change of settingsHistory) {
    if (change.adminId !== me) continue;
    items.push({ id: change.id, at: change.changedAt, category: 'Settings', text: change.summary, href: '/settings?tab=compliance' });
  }
  for (const customer of customers) {
    if (customer.suspension?.adminId !== me) continue;
    items.push({
      id: `suspend-${customer.id}`,
      at: customer.suspension.suspendedAt,
      category: 'Customers',
      text: `Suspended ${customer.name}'s bookings`,
      href: `/customers?id=${customer.id}`,
    });
  }
  for (const booking of bookings) {
    const cancellation = booking.timeline.find((event) => event.id === `${booking.id}_cancelled_by_admin`);
    if (!cancellation || !cancellation.detail.startsWith(`Cancelled by ${CURRENT_ADMIN.name}`)) continue;
    items.push({
      id: `cancel-${booking.id}`,
      at: cancellation.at,
      category: 'Bookings',
      text: `Cancelled ${booking.reference}`,
      href: `/bookings?booking=${booking.id}`,
    });
  }

  return respond({ member, activity: items.sort((a, b) => compareIso(b.at, a.at)) });
}
