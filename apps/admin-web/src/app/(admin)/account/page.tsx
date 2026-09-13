'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui-kit/Avatar';
import { Card } from '@/components/ui-kit/Card';
import { EmptyState } from '@/components/ui-kit/EmptyState';
import { LinkButton } from '@/components/ui-kit/LinkButton';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { SEED_NOW } from '@/lib/dates';
import { relativeTime } from '@/lib/format';
import {
  NOTIFICATION_KINDS,
  getAccountSummary,
  getMutedNotificationKinds,
  setNotificationKindEnabled,
  type AccountSummary,
  type NotificationKind,
} from '@/lib/services';

/**
 * The signed-in administrator's own page, reached from the header's account menu.
 *
 * Who they are on the team, everything they have done in the portal, and which alerts
 * the notification bell shows them.
 */
export default function AccountPage() {
  const [summary, setSummary] = useState<AccountSummary>();
  const [muted, setMuted] = useState<Set<string>>();
  const [notice, setNotice] = useState<string>();

  const load = useCallback(async () => {
    const [nextSummary, nextMuted] = await Promise.all([getAccountSummary(), getMutedNotificationKinds()]);
    setSummary(nextSummary);
    setMuted(new Set(nextMuted));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* The menu's "Notification preferences" arrives with #preferences; bring it into view once it has rendered. */
  useEffect(() => {
    if (!muted || window.location.hash !== '#preferences') return;
    document.getElementById('preferences')?.scrollIntoView({ block: 'start' });
  }, [muted]);

  async function toggle(kind: NotificationKind, label: string, enabled: boolean): Promise<void> {
    await setNotificationKindEnabled(kind, enabled);
    setMuted(new Set(await getMutedNotificationKinds()));
    setNotice(enabled ? `The bell will show "${label}" again.` : `The bell will no longer show "${label}".`);
  }

  return (
    <div className="grid grid-cols-12 items-start gap-5">
      <Card className="col-span-12 flex flex-col p-6 lg:col-span-4">
        {!summary ? (
          <Skeleton lines={6} />
        ) : (
          <>
            <div className="flex items-start gap-4">
              <Avatar name={summary.member.name} size={72} />
              <div className="min-w-0 pt-1">
                <h2 className="font-display text-card-title font-medium text-ink">{summary.member.name}</h2>
                <p className="mt-0.5 text-table text-muted">{summary.member.role}</p>
              </div>
            </div>
            <dl className="mt-5 flex flex-col gap-2 border-t border-hairline pt-4">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-table text-muted">Email</dt>
                <dd className="text-table text-ink">{summary.member.email}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-table text-muted">On the team since</dt>
                <dd className="text-table text-ink">
                  {new Date(summary.member.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </dd>
              </div>
            </dl>
            <div className="mt-4 rounded-tile border border-hairline bg-ground p-3">
              <p className="text-pill font-medium text-muted">What you can do</p>
              <p className="mt-1 text-table text-ink">{summary.member.permissions}</p>
            </div>
            <LinkButton href="/settings?tab=team" className="mt-4 self-start">
              See the whole team
            </LinkButton>
          </>
        )}
      </Card>

      <div className="col-span-12 flex flex-col gap-5 lg:col-span-8">
        <Card className="p-6">
          <SectionHeader title="What you have done" subtitle="Every action recorded under your name, newest first" />
          {!summary ? (
            <div className="mt-5">
              <Skeleton lines={6} />
            </div>
          ) : summary.activity.length === 0 ? (
            <EmptyState
              className="mt-3"
              title="Nothing recorded under your name yet"
              description="Verifying documents, resolving disputes, changing settings and suspending bookings all appear here."
              action={<LinkButton href="/verification">Open the verification queue</LinkButton>}
            />
          ) : (
            <ol className="mt-4 flex flex-col divide-y divide-hairline">
              {summary.activity.slice(0, 20).map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 first:pt-0">
                  <span className="w-28 flex-none text-pill text-muted">{item.category}</span>
                  <Link href={item.href} className="min-w-0 flex-1 text-table text-ink hover:underline">
                    {item.text}
                  </Link>
                  <span className="text-pill text-muted">{relativeTime(item.at, SEED_NOW)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card id="preferences" className="scroll-mt-4 p-6">
          <SectionHeader title="Notification preferences" subtitle="Which alerts the bell in the header shows you" />
          {notice ? (
            <p role="status" className="mt-4 rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2 text-table text-ink">
              {notice}
            </p>
          ) : null}
          {!muted ? (
            <div className="mt-5">
              <Skeleton lines={6} />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-hairline">
              {NOTIFICATION_KINDS.map((option) => {
                const enabled = !muted.has(option.kind);
                return (
                  <li key={option.kind} className="py-3 first:pt-0 last:pb-0">
                    <label className="flex cursor-pointer items-start justify-between gap-4">
                      <span>
                        <span className="block text-table text-ink">{option.label}</span>
                        <span className="block text-pill text-muted">{option.description}</span>
                      </span>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-checked={enabled}
                        checked={enabled}
                        onChange={(event) => void toggle(option.kind, option.label, event.target.checked)}
                        className="mt-1 h-4 w-4 flex-none accent-marigold"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
