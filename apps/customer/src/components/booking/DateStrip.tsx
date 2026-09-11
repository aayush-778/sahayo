import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@sahayo/ui-native';

import type { ScheduleDay } from '../../lib/schedule';

/**
 * The seven bookable days, as a horizontally scrollable row.
 *
 * Scrollable rather than shrunk to fit. Seven boxes wide enough for शुक्र and
 * a date number come to about 500pt, which no phone shows at once — and
 * squeezing them would clip the longest Devanagari weekday, which is exactly
 * the label a Hindi-first user needs most.
 *
 * The month and year sit above the row rather than inside each box. A
 * seven-day window crosses a month boundary roughly a fifth of the time, and
 * "29, 30, 31, 01, 02" with no month anywhere is genuinely ambiguous. When
 * the window straddles two months the caption names both.
 *
 * A day whose slots have all been taken is still shown and still tappable —
 * the time section explains why it is empty. Hiding it would make the row
 * jump around as the day goes on.
 */
export function DateStrip({
  days,
  selectedKey,
  onSelect,
}: {
  days: ScheduleDay[];
  selectedKey: string | null;
  onSelect: (day: ScheduleDay) => void;
}) {
  const { t } = useTranslation();

  const first = days[0];
  const last = days[days.length - 1];
  const caption =
    first && last && (first.month !== last.month || first.year !== last.year)
      ? t('booking.schedule.monthSpan', {
          from: t(`booking.schedule.months.${first.month}`),
          to: t(`booking.schedule.months.${last.month}`),
          year: last.year,
        })
      : t('booking.schedule.monthCaption', {
          month: first ? t(`booking.schedule.months.${first.month}`) : '',
          year: first?.year ?? '',
        });

  return (
    <View>
      <Text weight="medium" className="text-sm text-brand-muted">
        {caption}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Bleeds past the screen's px-6 so the row scrolls edge to edge while
        // the first box still lines up with the heading above it.
        className="-mx-6 mt-2"
        contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
      >
        {days.map((day) => {
          const active = day.key === selectedKey;
          const label = day.isToday
            ? t('booking.schedule.today')
            : t(`booking.schedule.weekdays.${day.weekday}`);

          return (
            <Pressable
              key={day.key}
              onPress={() => onSelect(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label} ${day.dayOfMonth} ${t(
                `booking.schedule.months.${day.month}`,
              )}`}
              className={`w-16 items-center rounded-xl border-2 py-2.5 ${
                active
                  ? 'border-brand-primary bg-brand-primary-tint'
                  : 'border-brand-border bg-brand-surface'
              }`}
            >
              <Text
                weight="medium"
                className={`text-xs ${active ? 'text-brand-primary' : 'text-brand-muted'}`}
                numberOfLines={1}
              >
                {label}
              </Text>
              <Text weight="bold" className="mt-0.5 text-lg text-brand-navy">
                {day.dayOfMonth}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
