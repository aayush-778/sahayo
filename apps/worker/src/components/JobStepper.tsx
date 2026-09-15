import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BookingStatus, type Booking } from '@sahayo/shared';
import { Text } from '@sahayo/ui-native';

const STEPS: readonly Booking['status'][] = [
  BookingStatus.ACCEPTED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

/** Where a job is in ACCEPTED → COMPLETED: five segments, the status named. */
export function JobStepper({ status }: { status: Booking['status'] }) {
  const { t } = useTranslation();
  const index = status === BookingStatus.SETTLED ? STEPS.length - 1 : STEPS.indexOf(status);
  if (index < 0) return null;

  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: index + 1 }}>
      <View className="flex-row gap-1.5">
        {STEPS.map((step, position) => (
          <View
            key={step}
            className={`h-1.5 flex-1 rounded-full ${position <= index ? 'bg-worker-primary' : 'bg-worker-primary-soft'}`}
          />
        ))}
      </View>
      <View className="mt-1.5 flex-row items-center justify-between">
        <Text weight="semibold" className="text-sm text-worker-primary">
          {t(`worker.status.${status}`)}
        </Text>
        <Text className="text-xs text-worker-muted">
          {t('worker.onboarding.stepOf', { step: index + 1, total: STEPS.length })}
        </Text>
      </View>
    </View>
  );
}
