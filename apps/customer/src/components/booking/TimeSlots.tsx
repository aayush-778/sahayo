import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Text } from '@sahayo/ui-native';

import { periodOf, twelveHour, type ScheduleSlot } from '../../lib/schedule';

/**
 * Formats a slot's start time for the current language.
 *
 * English puts the period after the clock — "1:00 PM" — and Hindi puts it
 * before — "दोपहर 1:00". That ordering difference lives entirely in the
 * `timeFormat` string in each catalogue, so neither language needs code of
 * its own and the two cannot disagree about when the afternoon ends: both
 * read the same boundary table in `periodOf`.
 *
 * No `Intl.DateTimeFormat`. See the note at the top of `lib/schedule.ts`.
 */
export function useSlotLabel(): (hour: number) => string {
  const { t } = useTranslation();

  return (hour: number) =>
    t('booking.schedule.timeFormat', {
      hour: twelveHour(hour),
      period: t(`booking.schedule.periods.${periodOf(hour)}`),
    });
}

/**
 * The day's slots, as tappable pills.
 *
 * Pills rather than a dropdown: a dropdown hides how much capacity exists,
 * and showing which slots are already taken is half the point of the screen.
 *
 * An unavailable slot is rendered and disabled rather than removed. A gap in
 * the row says "someone else has that one", which is a cooperative with real
 * demand; silently dropping it just makes for a shorter list that says
 * nothing. Slots that have already passed today are a different case and are
 * removed entirely — see `buildSchedule`.
 *
 * Wrapping uses a negative margin on the container against a matching margin
 * on each pill, rather than `gap`, so the row stays expressible in
 * `className` alone.
 */
export function TimeSlots({
  slots,
  selectedHour,
  onSelect,
}: {
  slots: ScheduleSlot[];
  selectedHour: number | null;
  onSelect: (hour: number) => void;
}) {
  const { t } = useTranslation();
  const label = useSlotLabel();

  if (slots.length === 0) {
    return (
      <View className="rounded-xl border border-brand-border bg-brand-surface px-4 py-5">
        <Text className="text-center text-sm text-brand-muted">
          {t('booking.schedule.noSlots')}
        </Text>
      </View>
    );
  }

  return (
    <View className="-m-1 flex-row flex-wrap">
      {slots.map((slot) => {
        const active = slot.hour === selectedHour;

        return (
          <Pressable
            key={slot.hour}
            onPress={() => onSelect(slot.hour)}
            disabled={slot.unavailable}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: slot.unavailable }}
            accessibilityLabel={
              slot.unavailable
                ? t('booking.schedule.slotTaken', { time: label(slot.hour) })
                : label(slot.hour)
            }
            className={`m-1 rounded-xl border-2 px-4 py-2.5 ${
              slot.unavailable
                ? 'border-brand-border bg-brand-cream'
                : active
                  ? 'border-brand-primary bg-brand-primary-tint'
                  : 'border-brand-border bg-brand-surface'
            }`}
          >
            <Text
              weight={active ? 'semibold' : 'regular'}
              // Struck through rather than faded to the border colour: a
              // taken slot still has to be readable, or the customer cannot
              // tell which time they have lost.
              className={`text-sm ${
                slot.unavailable
                  ? 'text-brand-muted line-through'
                  : active
                    ? 'text-brand-primary'
                    : 'text-brand-navy'
              }`}
            >
              {label(slot.hour)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
