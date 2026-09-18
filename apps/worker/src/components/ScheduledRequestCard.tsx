import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistance, formatDuration, formatPaise, Text, useThemeColors } from '@sahayo/ui-native';

import { formatClock } from '../lib/datetime';
import { clockParts, findSubCategory, localizedName, useLanguage, type ScheduledRequestView } from '../services';

/**
 * One booked-ahead request.
 *
 * Deliberately not the instant offer card: no countdown, no alarm, smaller type, and
 * the slot on the left where the eye lands first — a job for Saturday is read, not
 * reacted to. A request that would collide with work already taken says so and offers
 * "Review clash" in place of Accept, so it cannot be taken without seeing the clash.
 *
 * The buttons are 30 px tall to keep the card compact, and carry hitSlop to the 44 px
 * a thumb needs outdoors.
 */

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export function ScheduledRequestCard({
  view,
  busy,
  onAccept,
  onDecline,
  onReview,
}: {
  view: ScheduledRequestView;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onReview: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const language = useLanguage();

  const { request, conflicts } = view;
  const booking = request.booking;
  const service = findSubCategory(booking.serviceCategoryId);
  const address = booking.address;
  const clash = conflicts[0];
  const at = new Date(view.startsAtMs);
  /* Split rather than formatted, so the hour and the part of the day can stack — and so
     Hindi, which puts "दोपहर" first, still reads correctly. */
  const slot = clockParts(`${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`);

  return (
    <View className={`rounded-xl border bg-worker-surface p-3 ${clash ? 'border-[#E9C48F]' : 'border-worker-border'}`}>
      <View className="flex-row">
        {/* The slot, first and largest thing on the card. */}
        <View className="w-12 items-center rounded-lg bg-worker-primary-tint py-1">
          <Text weight="bold" className="text-[13px] leading-[18px] text-worker-primary-dark">
            {`${slot.hour}:${slot.minute}`}
          </Text>
          <Text weight="semibold" className="text-[10px] leading-[14px] text-worker-primary-dark">
            {t(`worker.onboarding.availability.periods.${slot.period}`)}
          </Text>
        </View>

        <View className="ml-3 flex-1">
          <Text weight="semibold" className="text-xs text-worker-ink" numberOfLines={2}>
            {service ? localizedName(service, language) : booking.serviceCategoryId}
          </Text>

          <View className="mt-0.5 flex-row flex-wrap items-center gap-x-3">
            <Row icon="person-outline" colour={colors.muted} text={request.customer.name} />
            <Row
              icon="location-outline"
              colour={colors.muted}
              text={`${address.line2 ?? address.line1} · ${formatDistance(request.distanceM, language)}`}
            />
            <Row icon="time-outline" colour={colors.muted} text={formatDuration(request.estimatedMinutes, language)} />
          </View>

          <View className="mt-1.5 flex-row items-baseline justify-between border-t border-dashed border-worker-border pt-1.5">
            <Text className="text-[11px] text-worker-muted">
              {t('worker.scheduled.fare')}{' '}
              <Text weight="semibold" className="text-xs text-worker-ink">
                {formatPaise(booking.fare?.total ?? 0, language)}
              </Text>
            </Text>
            <Text className="text-[11px] text-worker-muted">
              {t('worker.scheduled.net')}{' '}
              <Text weight="semibold" className="text-xs text-worker-success">
                {formatPaise(booking.fare?.workerShare ?? 0, language)}
              </Text>
            </Text>
          </View>

          {clash ? (
            <View className="mt-1.5 flex-row rounded-md bg-worker-warning-soft px-2 py-1">
              <Ionicons name="warning-outline" size={12} color={colors.warning} style={{ marginTop: 2 }} />
              <Text className="ml-1.5 flex-1 text-[11px] leading-[16px] text-worker-warning">
                {t('worker.scheduled.clash', {
                  time: formatClock(new Date(clash.startsAt), t),
                  service: clash.serviceName,
                  locality: clash.locality,
                  minutes: clash.overlapMinutes,
                  count: conflicts.length,
                })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="mt-2 flex-row gap-1.5">
        <SmallButton label={t('worker.scheduled.decline')} tone="ghost" onPress={onDecline} disabled={busy} />
        {clash ? (
          <SmallButton label={t('worker.scheduled.review')} tone="warning" onPress={onReview} disabled={busy} />
        ) : (
          <SmallButton label={t('worker.scheduled.accept')} tone="primary" onPress={onAccept} disabled={busy} busy={busy} />
        )}
      </View>
    </View>
  );
}

function Row({ icon, colour, text }: { icon: 'person-outline' | 'location-outline' | 'time-outline'; colour: string; text: string }) {
  return (
    <View className="flex-row items-center">
      <Ionicons name={icon} size={11} color={colour} />
      <Text className="ml-1 text-[11px] text-worker-muted" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function SmallButton({
  label,
  tone,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  tone: 'primary' | 'ghost' | 'warning';
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const ground =
    tone === 'primary' ? 'bg-worker-primary' : tone === 'warning' ? 'bg-worker-warning' : 'border border-worker-outline bg-worker-surface';
  const ink = tone === 'ghost' ? 'text-worker-muted' : 'text-white';
  return (
    <Pressable
      className={`h-[30px] flex-1 flex-row items-center justify-center rounded-lg ${ground} ${disabled ? 'opacity-60' : ''}`}
      hitSlop={HIT}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
      <Text weight="semibold" className={`text-[11.5px] ${ink} ${busy ? 'ml-1.5' : ''}`}>
        {label}
      </Text>
    </Pressable>
  );
}
