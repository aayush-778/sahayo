import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { OFFER_WINDOW_MS } from '../services';

/**
 * Time left to answer an offer: seconds in words, and a bar that drains.
 *
 * Ticks four times a second so the bar moves smoothly, and stops ticking at
 * zero. Blue while there is time, amber in the last ten seconds, red at zero —
 * with the words changing too, so the urgency is not carried by colour alone.
 *
 * At zero the offer is withdrawn and a new one takes its place — see tickOffers.
 */
export function OfferCountdown({ deadline, className = '' }: { deadline: number; className?: string }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [now, setNow] = useState(() => Date.now());

  const running = now < deadline;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [running]);

  const remainingMs = Math.max(0, deadline - now);
  const seconds = Math.ceil(remainingMs / 1000);
  const percent = Math.min(100, (remainingMs / OFFER_WINDOW_MS) * 100);
  const urgent = seconds <= 10;
  const done = seconds === 0;

  const tone = done ? 'text-worker-danger' : urgent ? 'text-worker-warning' : 'text-worker-primary';
  const fill = done ? 'bg-worker-danger' : urgent ? 'bg-worker-warning' : 'bg-worker-primary';
  const iconColor = done ? colors.danger : urgent ? colors.warning : colors.primary;
  const label = done ? t('worker.dashboard.request.respondNow') : t('worker.dashboard.request.expiresIn', { s: seconds });

  return (
    <View className={className} accessibilityLiveRegion={urgent ? 'polite' : 'none'} accessibilityLabel={label}>
      <View className="flex-row items-center">
        <Ionicons name="timer-outline" size={16} color={iconColor} />
        <Text weight="bold" className={`ml-1.5 text-sm ${tone}`}>
          {label}
        </Text>
      </View>
      <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-worker-primary-soft">
        <View className={`h-full rounded-full ${fill}`} style={{ width: `${percent}%` }} />
      </View>
    </View>
  );
}
