'use client';

import { useState } from 'react';
import type { DispatchSettings, EquityWeightSettings } from '@sahayo/shared';
import { Button } from '@/components/ui-kit/Button';
import { Card } from '@/components/ui-kit/Card';
import { SectionHeader } from '@/components/ui-kit/SectionHeader';
import { Slider } from '@/components/ui-kit/Slider';
import { saveDispatchSettings } from '@/lib/services';

type WeightKey = keyof EquityWeightSettings;

const WEIGHTS: ReadonlyArray<{ key: WeightKey; label: string; description: string }> = [
  {
    key: 'proximityPercent',
    label: 'How close they are',
    description: 'Nearer workers score higher, measured against the broadcast radius.',
  },
  {
    key: 'ratingPercent',
    label: 'How they are rated',
    description: 'Better-rated workers score higher.',
  },
  {
    key: 'inverseAllocationPercent',
    label: 'How little work they have had',
    description: 'Workers with fewer jobs this week score higher. This is what shares work out fairly.',
  },
];

/**
 * Moves one weight and shares the difference across the other two in proportion to
 * their current values, so the three always add up to exactly 100.
 */
export function rebalanceWeights(weights: EquityWeightSettings, key: WeightKey, value: number): EquityWeightSettings {
  const others = WEIGHTS.map((weight) => weight.key).filter((candidate) => candidate !== key);
  const remaining = 100 - value;
  const currentOthers = others.reduce((sum, other) => sum + weights[other], 0);
  const next = { ...weights, [key]: value };
  let allocated = 0;
  others.forEach((other, index) => {
    if (index === others.length - 1) {
      next[other] = remaining - allocated;
      return;
    }
    const share = currentOthers === 0 ? remaining / others.length : (remaining * weights[other]) / currentOthers;
    next[other] = Math.round(share);
    allocated += next[other];
  });
  return next;
}

export interface DispatchTabProps {
  dispatch: DispatchSettings;
  onSaved: (message: string) => void;
}

/** The rules the equity dispatcher runs on. */
export function DispatchTab({ dispatch, onSaved }: DispatchTabProps) {
  const [draft, setDraft] = useState<DispatchSettings>(dispatch);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(dispatch);
  const { weights } = draft;
  const driftingToNearest = weights.inverseAllocationPercent < weights.proximityPercent;

  async function save(): Promise<void> {
    setSaving(true);
    setError(undefined);
    try {
      await saveDispatchSettings(draft);
      onSaved('Saved the dispatch rules. The next request is ranked with them, and every equity score has been recalculated.');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-12 p-6 lg:col-span-5">
        <SectionHeader title="How far a request goes" subtitle="Who hears about a job, and for how long" />
        <div className="mt-5 flex flex-col gap-6">
          <Slider
            label="Broadcast radius"
            value={draft.broadcastRadiusKm}
            min={1}
            max={15}
            step={0.5}
            format={(value) => `${value} km`}
            onChange={(value) => setDraft({ ...draft, broadcastRadiusKm: value })}
            description="Workers further than this are never offered the job. A wider radius reaches more workers but sends them further."
          />
          <Slider
            label="Time to accept"
            value={draft.pingTimeoutSeconds}
            min={10}
            max={120}
            step={5}
            format={(value) => `${value}s`}
            onChange={(value) => setDraft({ ...draft, pingTimeoutSeconds: value })}
            description="How long each offer stays open before it passes to the next worker in the ranking."
          />
        </div>
      </Card>

      <Card className="col-span-12 p-6 lg:col-span-7">
        <SectionHeader
          title="How workers are ranked"
          subtitle="Three weights that always add up to 100%"
        />
        <div className="mt-5 flex flex-col gap-6">
          {WEIGHTS.map((weight) => (
            <Slider
              key={weight.key}
              label={weight.label}
              value={weights[weight.key]}
              min={0}
              max={100}
              format={(value) => `${value}%`}
              onChange={(value) => setDraft({ ...draft, weights: rebalanceWeights(weights, weight.key, value) })}
              description={weight.description}
            />
          ))}
        </div>

        {driftingToNearest ? (
          <p role="status" className="mt-5 rounded-tile border border-coral/60 bg-coral/10 px-4 py-2.5 text-table text-ink">
            Distance now counts for more than how little work someone has had. Dispatch will lean back
            toward whoever is nearest, and busy workers near the centre will take more of the jobs.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-hairline pt-4">
          {error ? (
            <p role="alert" className="mr-auto text-pill text-ink">
              {error}
            </p>
          ) : null}
          <Button variant="ghost" disabled={!dirty || saving} onClick={() => setDraft(dispatch)}>
            Discard edits
          </Button>
          <Button variant="primary" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? 'Saving rules' : 'Save dispatch rules'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
