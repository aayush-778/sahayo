import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, Text } from '@sahayo/ui-native';

import { useConnection } from '../services/live';

/** How long "Back online" stays up after a reconnect. */
const RESTORED_NOTE_MS = 2_500;

/**
 * A strip across the top of the screen saying whether the app is talking to the
 * cooperative's server.
 *
 * Nothing while connected. Amber with a spinner while reconnecting after a drop — the
 * bookings stay on screen underneath. Navy on cream when the server was never reached this
 * session, so nobody mistakes the demo data for live data. Green, briefly, when a dropped
 * connection comes back.
 *
 * It takes up room rather than floating over the screen: an overlay hid the top of
 * whatever was underneath it, which is where every screen's title sits. The root layout
 * renders it above the navigator and, while it is up, gives the screens below a top inset
 * of zero, because this strip has already covered the status bar.
 */

export interface ConnectionNotice {
  ground: string;
  label: string;
  icon: 'cloud-offline-outline' | 'checkmark-circle' | null;
  iconColor: string;
}

/** What the strip should say right now, or null when there is nothing to say. */
export function useConnectionNotice(): ConnectionNotice | null {
  const { t } = useTranslation();
  const { mode, attempt, restoredAt } = useConnection();
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (mode !== 'live' || !restoredAt) return;
    setShowRestored(true);
    const timer = setTimeout(() => setShowRestored(false), RESTORED_NOTE_MS);
    return () => clearTimeout(timer);
  }, [mode, restoredAt]);

  if (mode === 'reconnecting') {
    return {
      ground: 'bg-brand-warning-soft',
      label: attempt > 0 ? t('connection.reconnectingAttempt', { n: attempt }) : t('connection.reconnecting'),
      icon: null,
      iconColor: brandColors.warning,
    };
  }
  if (mode === 'offline') {
    return { ground: 'bg-brand-primary-soft', label: t('connection.offline'), icon: 'cloud-offline-outline', iconColor: brandColors.muted };
  }
  if (mode === 'live' && showRestored) {
    return { ground: 'bg-brand-success-soft', label: t('connection.restored'), icon: 'checkmark-circle', iconColor: brandColors.success };
  }
  return null;
}

export function ConnectionBanner({ notice }: { notice: ConnectionNotice | null }) {
  const insets = useSafeAreaInsets();
  if (!notice) return null;

  return (
    <View
      pointerEvents="none"
      className={`flex-row items-center px-4 pb-2 ${notice.ground}`}
      style={{ paddingTop: insets.top + 6 }}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {notice.icon ? (
        <Ionicons name={notice.icon} size={18} color={notice.iconColor} />
      ) : (
        <ActivityIndicator size="small" color={notice.iconColor} />
      )}
      <Text weight="semibold" className="ml-2 flex-1 text-sm text-brand-navy" numberOfLines={2}>
        {notice.label}
      </Text>
    </View>
  );
}
