import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { etaMinutesFor, metresBetween } from '@sahayo/shared';
import { formatDistance, Text, useThemeColors } from '@sahayo/ui-native';

import { formatClock } from '../lib/datetime';
import { useLanguage, type ScheduledRequestView } from '../services';
import { SmallButton } from './ScheduledRequestCard';
import { Sheet } from './Sheet';

/**
 * The clash, before it is accepted.
 *
 * Two bars on one hour scale, because "30 minutes overlap" is a sentence and the bars
 * are the thing a worker can judge in a second. The ride between the two addresses is
 * included: whether the day still works depends on it, and the app knows both points.
 * The safe choice sits on the left; taking the job anyway needs the second tap.
 */
export function ConflictSheet({
  view,
  busy,
  onClose,
  onConfirm,
}: {
  view: ScheduledRequestView | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();
  if (!view) return <Sheet visible={false} title="" onClose={onClose}>{null}</Sheet>;

  const clash = view.conflicts[0]!;
  const request = view.request;
  const newSlot = { start: view.startsAtMs, end: view.startsAtMs + request.estimatedMinutes * 60_000 };
  const taken = { start: Date.parse(clash.startsAt), end: Date.parse(clash.endsAt) };

  /* One scale for both bars, with a little air either side. */
  const from = Math.min(newSlot.start, taken.start) - 30 * 60_000;
  const to = Math.max(newSlot.end, taken.end) + 30 * 60_000;
  const span = Math.max(1, to - from);
  const place = (bar: { start: number; end: number }) => ({
    left: `${((bar.start - from) / span) * 100}%` as const,
    width: `${((bar.end - bar.start) / span) * 100}%` as const,
  });

  const metres = metresBetween(clash.location, request.booking.address.point);

  return (
    <Sheet visible title={t('worker.scheduled.conflict.title')} onClose={onClose}>
      <View className="gap-2 px-5 pt-1">
        <Text className="text-[11px] text-worker-muted">{formatClock(new Date(view.startsAtMs), t)}</Text>

        <View className="gap-1">
          <Bar
            label={t('worker.scheduled.conflict.have')}
            text={`${formatClock(new Date(taken.start), t)} · ${clash.serviceName}`}
            tone="taken"
            style={place(taken)}
          />
          <Bar
            label={t('worker.scheduled.conflict.new')}
            text={`${formatClock(new Date(newSlot.start), t)} · ${request.customer.name}`}
            tone="new"
            style={place(newSlot)}
          />
        </View>

        <View className="flex-row items-start">
          <Ionicons name="warning-outline" size={13} color={colors.warning} style={{ marginTop: 2 }} />
          <Text weight="semibold" className="ml-1.5 flex-1 text-[11px] leading-[16px] text-worker-warning">
            {t('worker.scheduled.conflict.overlap', { minutes: clash.overlapMinutes })}
          </Text>
        </View>
        <Text className="text-[11px] leading-[16px] text-worker-muted">
          {t('worker.scheduled.conflict.travel', {
            locality: clash.locality,
            distance: formatDistance(metres, language),
            minutes: etaMinutesFor(metres),
          })}
        </Text>

        <View className="mt-1 flex-row gap-1.5">
          <SmallButton label={t('worker.scheduled.conflict.keep')} tone="ghost" onPress={onClose} disabled={busy} />
          <SmallButton label={t('worker.scheduled.conflict.anyway')} tone="warning" onPress={onConfirm} disabled={busy} busy={busy} />
        </View>
      </View>
    </Sheet>
  );
}

function Bar({
  label,
  text,
  tone,
  style,
}: {
  label: string;
  text: string;
  tone: 'taken' | 'new';
  style: { left: `${number}%`; width: `${number}%` };
}) {
  return (
    <View className="flex-row items-center">
      <Text className="w-14 text-[11px] text-worker-muted" numberOfLines={1}>
        {label}
      </Text>
      <View className="h-6 flex-1 rounded-md bg-worker-ground">
        <View
          className={`absolute top-0 bottom-0 justify-center rounded-md px-1.5 ${
            tone === 'taken' ? 'bg-worker-primary-soft' : 'border border-dashed border-worker-warning bg-worker-warning-soft'
          }`}
          style={style}
        >
          <Text
            weight="semibold"
            className={`text-[10px] ${tone === 'taken' ? 'text-worker-primary-dark' : 'text-worker-warning'}`}
            numberOfLines={1}
          >
            {text}
          </Text>
        </View>
      </View>
    </View>
  );
}
