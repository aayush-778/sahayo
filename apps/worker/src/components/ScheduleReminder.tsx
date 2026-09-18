import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@sahayo/ui-native';

import { formatClock } from '../lib/datetime';
import { findSubCategory, localizedName, useLanguage, useScheduleReminder } from '../services';

/**
 * The slot coming up, from an hour before it.
 *
 * A prototype's stand-in for a push notification: the app cannot wake a closed phone
 * yet, so the reminder lives at the top of the screens a worker is already on. Tapping
 * it opens the job; Directions hands the address to whichever maps app the phone has.
 */
export function ScheduleReminder() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useLanguage();
  const reminder = useScheduleReminder();
  if (!reminder) return null;

  const { booking, minutesAway, dueSoon, customerName } = reminder;
  const service = findSubCategory(booking.serviceCategoryId);
  const name = service ? localizedName(service, language) : booking.serviceCategoryId;
  const point = booking.address.point;

  return (
    <Pressable
      className={`mt-3 flex-row items-center rounded-xl px-2.5 py-2 ${dueSoon ? 'bg-worker-warning' : 'bg-worker-primary'}`}
      onPress={() => router.push(`/job/${booking.id}`)}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <Ionicons name="time-outline" size={16} color="#FFFFFF" />
      <View className="ml-2 flex-1">
        <Text weight="semibold" className="text-xs text-white" numberOfLines={1}>
          {minutesAway > 0
            ? t('worker.scheduled.reminder.title', { service: name, minutes: minutesAway })
            : t('worker.scheduled.reminder.now', { service: name })}
        </Text>
        <Text className="text-[10.5px] text-worker-primary-soft" numberOfLines={1}>
          {[formatClock(new Date(reminder.startsAtMs), t), customerName, booking.address.line2 ?? booking.address.line1]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Pressable
        className="ml-2 h-[26px] flex-row items-center rounded-lg bg-white px-2"
        hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
        onPress={() => {
          /* The device's own maps app: Google Maps, or whatever answers a geo: link. */
          const label = encodeURIComponent(booking.address.line1);
          void Linking.openURL(`geo:${point.lat},${point.lng}?q=${point.lat},${point.lng}(${label})`).catch(() =>
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`),
          );
        }}
        accessibilityRole="button"
        accessibilityLabel={t('worker.scheduled.reminder.directions')}
      >
        <Ionicons name="navigate-outline" size={11} color={dueSoon ? '#9E5C08' : '#0A5FC2'} />
        <Text weight="semibold" className={`ml-1 text-[10.5px] ${dueSoon ? 'text-worker-warning' : 'text-worker-primary'}`}>
          {t('worker.scheduled.reminder.directions')}
        </Text>
      </Pressable>
    </Pressable>
  );
}
