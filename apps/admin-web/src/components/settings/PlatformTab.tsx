'use client';

import { useState } from 'react';
import type { PlatformDetails } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { savePlatformDetails } from '@/lib/services';

const FIELDS: ReadonlyArray<{
  key: keyof PlatformDetails;
  label: string;
  hint: string;
  type?: 'text' | 'email' | 'tel' | 'time';
  span?: 'full';
}> = [
  { key: 'cooperativeName', label: 'Cooperative name', hint: 'As registered. Printed at the top of every CRCS export.', span: 'full' },
  { key: 'registrationNumber', label: 'Registration number', hint: 'Issued by the Central Registrar under the MSCS Act, 2002.' },
  { key: 'registeredOffice', label: 'Registered office', hint: 'The address on the registration certificate.' },
  { key: 'supportPhone', label: 'Support phone', hint: 'Shown to customers and workers in both apps.', type: 'tel' },
  { key: 'supportEmail', label: 'Support email', hint: 'Where complaints and Ombudsman correspondence arrive.', type: 'email' },
  { key: 'serviceHoursStart', label: 'Bookings open', hint: 'India Standard Time. Requests before this wait until opening.', type: 'time' },
  { key: 'serviceHoursEnd', label: 'Bookings close', hint: 'India Standard Time. The last request is taken at this time.', type: 'time' },
];

export interface PlatformTabProps {
  details: PlatformDetails;
  onSaved: (message: string) => void;
}

/** The cooperative's registered identity and its service hours. */
export function PlatformTab({ details, onSaved }: PlatformTabProps) {
  const [draft, setDraft] = useState<PlatformDetails>(details);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const dirty = FIELDS.some((field) => draft[field.key] !== details[field.key]);

  async function save(): Promise<void> {
    setSaving(true);
    setError(undefined);
    try {
      await savePlatformDetails(draft);
      onSaved('Saved the platform details. The next CRCS export will carry them.');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <SectionHeader title="The cooperative" subtitle="Who the society is, and when it takes bookings" />
      <form
        className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {FIELDS.map((field) => (
          <label key={field.key} className={field.span === 'full' ? 'flex flex-col gap-1 md:col-span-2' : 'flex flex-col gap-1'}>
            <span className="text-pill font-medium text-muted">{field.label}</span>
            <input
              type={field.type ?? 'text'}
              value={draft[field.key]}
              onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
              className="h-9 rounded-pill border border-hairline bg-surface px-3 text-table text-ink"
            />
            <span className="text-pill text-muted">{field.hint}</span>
          </label>
        ))}

        <div className="flex flex-wrap items-center justify-end gap-3 md:col-span-2">
          {error ? (
            <p role="alert" className="mr-auto text-pill text-ink">
              {error}
            </p>
          ) : null}
          <Button variant="ghost" disabled={!dirty || saving} onClick={() => setDraft(details)}>
            Discard edits
          </Button>
          <Button type="submit" variant="primary" disabled={!dirty || saving}>
            {saving ? 'Saving details' : 'Save platform details'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
