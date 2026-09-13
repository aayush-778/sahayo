'use client';

import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TeamMember } from '@sahayo/shared';
import { Avatar } from '@/components/ui-kit/Avatar';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { Modal } from '@/components/ui-kit/Modal';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { CURRENT_ADMIN } from '@/lib/nav/session';
import { listTeam, resetDemoData } from '@/lib/services';

export interface TeamTabProps {
  onReset: (message: string) => void;
}

/** Who administers the cooperative, and the recovery action for a demo that went sideways. */
export function TeamTab({ onReset }: TeamTabProps) {
  const [team, setTeam] = useState<TeamMember[]>();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void listTeam().then(setTeam);
  }, []);

  async function reset(): Promise<void> {
    setResetting(true);
    setError(undefined);
    try {
      await resetDemoData();
      setConfirming(false);
      onReset('Reset the demo data. Every page now shows exactly what a fresh load shows.');
    } catch (caught) {
      setError(`${(caught as Error).message} Reload the page to start from the seed instead.`);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 p-6 lg:col-span-8">
        <SectionHeader title="The administration team" subtitle="Roles are agreed by the board and set here by the administrator" />
        {!team ? (
          <div className="mt-5">
            <Skeleton lines={6} />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-hairline">
            {team.map((member) => (
              <li key={member.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar name={member.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-table font-medium text-ink">
                    {member.name}
                    <span className="text-pill font-normal text-muted">{member.role}</span>
                    {member.id === CURRENT_ADMIN.id ? (
                      <span className="rounded-pill bg-marigold-tint px-2 py-0.5 text-[11px] font-medium text-ink">You</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-pill text-muted">{member.permissions}</p>
                </div>
                <a href={`mailto:${member.email}`} className="hidden flex-none text-pill text-muted hover:text-ink hover:underline sm:block">
                  {member.email}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="col-span-12 flex flex-col gap-3 p-6 lg:col-span-4">
        <SectionHeader title="Reset demo data" subtitle="For rehearsals and live demonstrations" />
        <p className="text-table text-muted">
          Puts every worker, booking, ledger entry, dispute, vote and setting back to its starting
          state. The figures afterwards match a fresh load to the paisa, so a fumbled run recovers in
          one click.
        </p>
        <Button
          variant="danger"
          className="mt-auto self-start"
          icon={<RotateCcw size={16} strokeWidth={1.5} aria-hidden />}
          onClick={() => setConfirming(true)}
        >
          Reset demo data
        </Button>
      </Card>

      <Modal open={confirming} onClose={() => setConfirming(false)} labelledBy="reset-title">
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 id="reset-title" className="font-display text-card-title font-medium text-ink">
              Reset all demo data?
            </h2>
            <p className="mt-1 text-table text-muted">
              Every change made since the page loaded is discarded: approvals, votes, refunds, loans,
              reversals, Aadhaar access log entries and settings. This cannot be undone.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-pill text-ink">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep my changes
            </Button>
            <Button variant="danger" disabled={resetting} onClick={() => void reset()}>
              {resetting ? 'Resetting demo data' : 'Reset demo data'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
