'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlatformSettings } from '@sahayo/shared';
import { ComplianceTab } from '@/components/settings/ComplianceTab';
import { DispatchTab } from '@/components/settings/DispatchTab';
import { PaymentsTab } from '@/components/settings/PaymentsTab';
import { PlatformTab } from '@/components/settings/PlatformTab';
import { TeamTab } from '@/components/settings/TeamTab';
import { Skeleton } from '@/components/ui-kit/Skeleton';
import { Tabs } from '@/components/ui-kit/Tabs';
import { getSettings } from '@/lib/services';

type SettingsTab = 'PLATFORM' | 'DISPATCH' | 'PAYMENTS' | 'COMPLIANCE' | 'TEAM';

const TABS: Array<{ value: SettingsTab; label: string }> = [
  { value: 'PLATFORM', label: 'Platform' },
  { value: 'DISPATCH', label: 'Dispatch' },
  { value: 'PAYMENTS', label: 'Payments' },
  { value: 'COMPLIANCE', label: 'Compliance' },
  { value: 'TEAM', label: 'Team' },
];

/**
 * Settings.
 *
 * Each tab edits a draft and saves through the settings service, which records every
 * change in the audit log the CRCS export carries. After any save the settings are read
 * back, and the tabs are re-keyed on that read, so no tab can keep showing a draft of
 * something that has since changed — including after "Reset demo data".
 */
export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('PLATFORM');
  const [settings, setSettings] = useState<PlatformSettings>();
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<string>();

  /* ?tab=compliance and the like open a tab directly. */
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')?.toUpperCase();
    const match = TABS.find((candidate) => candidate.value === requested);
    if (match) setTab(match.value);
  }, []);

  const load = useCallback(async () => {
    setSettings(await getSettings());
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const afterSave = useCallback(
    (message: string) => {
      setNotice(message);
      void load();
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        label="Settings sections"
        tabs={TABS}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setNotice(undefined);
        }}
      />

      {notice ? (
        <p role="status" className="rounded-tile border border-hairline bg-marigold-tint/50 px-4 py-2.5 text-table text-ink">
          {notice}
        </p>
      ) : null}

      <div role="tabpanel" aria-label={TABS.find((candidate) => candidate.value === tab)?.label}>
        {!settings ? (
          <div className="grid grid-cols-12 gap-5">
            <Skeleton className="col-span-12 h-80 rounded-card lg:col-span-7" />
            <Skeleton className="col-span-12 h-80 rounded-card lg:col-span-5" />
          </div>
        ) : tab === 'PLATFORM' ? (
          <PlatformTab key={version} details={settings.platform} onSaved={afterSave} />
        ) : tab === 'DISPATCH' ? (
          <DispatchTab key={version} dispatch={settings.dispatch} onSaved={afterSave} />
        ) : tab === 'PAYMENTS' ? (
          <PaymentsTab key={version} split={settings.split} onSaved={afterSave} />
        ) : tab === 'COMPLIANCE' ? (
          <ComplianceTab key={version} onNotice={setNotice} onOpenTab={setTab} />
        ) : (
          <TeamTab key={version} onReset={afterSave} />
        )}
      </div>
    </div>
  );
}
