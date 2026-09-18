import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { formatWhen } from '../lib/datetime';

/**
 * The way into booked-ahead work, on the dashboard.
 *
 * A labelled row rather than an icon: a worker has to know what it is without tapping
 * it. The badge says how many are waiting and the line under it says when the first one
 * is, so the row answers "is there anything for me later?" without being opened. It
 * stays on screen with nothing waiting, because a control that disappears cannot be
 * looked for.
 */
export function ScheduledEntry({ count, nextSlot, onPress }: { count: number; nextSlot?: string; onPress: () => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <Pressable
      className="mt-4 flex-row items-center rounded-xl border border-worker-outline bg-worker-surface px-2.5 py-2"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('worker.scheduled.entry.title')}, ${t('worker.scheduled.waiting', { count })}`}
    >
      <View className="h-7 w-7 items-center justify-center rounded-lg bg-worker-primary-tint">
        <Ionicons name="calendar-outline" size={15} color={colors.primary} />
      </View>
      <View className="ml-2.5 flex-1">
        <Text weight="semibold" className="text-[12.5px] leading-[17px] text-worker-ink">
          {t('worker.scheduled.entry.title')}
        </Text>
        <Text className="text-[11px] text-worker-muted" numberOfLines={1}>
          {nextSlot ? t('worker.scheduled.entry.next', { when: formatWhen(nextSlot, t) }) : t('worker.scheduled.entry.none')}
        </Text>
      </View>
      {count > 0 ? (
        <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-worker-primary px-1.5">
          <Text weight="bold" className="text-[10px] text-white">
            {count}
          </Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color={colors.muted} style={{ marginLeft: 6 }} />
    </Pressable>
  );
}
