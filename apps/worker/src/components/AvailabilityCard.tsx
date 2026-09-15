import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

const TRACK_TRAVEL = 36;

/**
 * "Available for work" — the most important control in the app.
 *
 * The whole card is the switch, not just the knob: it is the largest target on
 * the dashboard, pressed with a thumb, outdoors. The two states are told apart
 * by more than a knob position — the card itself turns solid blue when online
 * and stays white with an outline when offline, the state is named in words,
 * and the status line underneath changes — so it reads in sunlight, in a
 * photograph, and to someone who cannot tell the colours apart.
 *
 * The knob springs rather than jumps, and the card shows a spinner while the
 * change is in flight, so the tap feels deliberate. In Phase 5 this same press
 * opens the socket connection and unlocks audio for job alerts; a control that
 * does that much should not flip by accident or silently.
 */
export function AvailabilityCard({
  isAvailable,
  radiusKm,
  busy,
  onToggle,
}: {
  isAvailable: boolean;
  radiusKm: number;
  busy: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [progress] = useState(() => new Animated.Value(isAvailable ? 1 : 0));

  useEffect(() => {
    Animated.spring(progress, {
      toValue: isAvailable ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  }, [isAvailable, progress]);

  const on = isAvailable;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, TRACK_TRAVEL] });

  return (
    <Pressable
      className={`rounded-2xl p-4 ${on ? 'bg-worker-primary' : 'border-2 border-worker-outline bg-worker-surface'}`}
      onPress={onToggle}
      disabled={busy}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, busy }}
      accessibilityLabel={t('worker.dashboard.availability.title')}
      accessibilityHint={
        on ? t('worker.dashboard.availability.hintGoOffline') : t('worker.dashboard.availability.hintGoOnline')
      }
    >
      <View className="flex-row items-center">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center">
            <View className={`h-3 w-3 rounded-full ${on ? 'bg-white' : 'bg-worker-muted'}`} />
            <Text weight="bold" className={`ml-2 text-sm ${on ? 'text-white' : 'text-worker-muted'}`}>
              {on ? t('worker.dashboard.availability.online') : t('worker.dashboard.availability.offline')}
            </Text>
          </View>
          <Text weight="bold" className={`mt-1 text-xl ${on ? 'text-white' : 'text-worker-ink'}`}>
            {t('worker.dashboard.availability.title')}
          </Text>
        </View>

        {/* The switch: 84×48, knob 40. */}
        <View
          className={`h-12 w-[84px] justify-center rounded-full px-1 ${on ? 'bg-white' : 'bg-worker-outline'}`}
          importantForAccessibility="no-hide-descendants"
        >
          {/* NativeWind styles View but not Animated.View, so the knob's look
              lives on a plain View and Animated.View carries only the slide. */}
          <Animated.View style={{ transform: [{ translateX }] }}>
            <View className={`h-10 w-10 items-center justify-center rounded-full ${on ? 'bg-worker-primary' : 'bg-white'}`}>
              {busy ? (
                <ActivityIndicator size="small" color={on ? colors.onPrimary : colors.primary} />
              ) : (
                <Ionicons name={on ? 'checkmark' : 'power'} size={18} color={on ? colors.onPrimary : colors.muted} />
              )}
            </View>
          </Animated.View>
        </View>
      </View>

      <View className="mt-3 flex-row items-center">
        <Ionicons name="location" size={16} color={on ? colors.onPrimary : colors.primary} />
        <Text weight="semibold" className={`ml-1 text-base ${on ? 'text-white' : 'text-worker-ink'}`}>
          {t('worker.dashboard.availability.radius', { km: radiusKm })}
        </Text>
      </View>
      <Text className={`mt-1 text-base ${on ? 'text-white' : 'text-worker-muted'}`}>
        {on ? t('worker.dashboard.availability.visible') : t('worker.dashboard.availability.hidden')}
      </Text>
    </Pressable>
  );
}
