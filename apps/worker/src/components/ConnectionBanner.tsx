import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, useThemeColors } from '@sahayo/ui-native';

import { useConnection } from '../services';

/** How long "Back online" stays up after a reconnect. */
const RESTORED_NOTE_MS = 2_500;

/**
 * A strip across the top of the screen saying whether the app is talking to the
 * cooperative's server.
 *
 * Nothing while connected. Amber with a spinner while reconnecting after a drop — the
 * server's data stays on screen underneath. Grey when the server was never reached this
 * session, so nobody mistakes the demo data for live data. Green, briefly, when a dropped
 * connection comes back.
 *
 * It takes up room rather than floating over the screen: an overlay hid the top of
 * whatever was underneath it, which is where the greeting and every screen title sit.
 * The root layout renders it above the navigator and, while it is up, gives the screens
 * below a top inset of zero, because this strip has already covered the status bar.
 */

export interface ConnectionNotice {
  ground: string;
  ink: string;
  icon: 'cloud-offline-outline' | 'checkmark-circle' | null;
  label: string;
  /** For the icon's colour: only the restored note is green. */
  restored: boolean;
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
      ground: 'bg-worker-warning-soft',
      ink: 'text-worker-ink',
      icon: null,
      label: attempt > 0 ? t('worker.connection.reconnectingAttempt', { n: attempt }) : t('worker.connection.reconnecting'),
      restored: false,
    };
  }
  if (mode === 'offline') {
    return {
      ground: 'bg-worker-primary-soft',
      ink: 'text-worker-ink',
      icon: 'cloud-offline-outline',
      label: t('worker.connection.offline'),
      restored: false,
    };
  }
  if (mode === 'live' && showRestored) {
    return {
      ground: 'bg-worker-success-soft',
      ink: 'text-worker-ink',
      icon: 'checkmark-circle',
      label: t('worker.connection.restored'),
      restored: true,
    };
  }
  return null;
}

export function ConnectionBanner({ notice }: { notice: ConnectionNotice | null }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
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
        <Ionicons name={notice.icon} size={18} color={notice.restored ? colors.success : colors.muted} />
      ) : (
        <ActivityIndicator size="small" color={colors.warning} />
      )}
      <Text weight="semibold" className={`ml-2 flex-1 text-sm ${notice.ink}`} numberOfLines={2}>
        {notice.label}
      </Text>
    </View>
  );
}
