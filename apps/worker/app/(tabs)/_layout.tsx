import { useTranslation } from 'react-i18next';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fontFamilies, useFontScript, useThemeColors } from '@sahayo/ui-native';

import { useOfferDispatch, useUnreadTotal } from '../../src/services';

/**
 * The five-tab bar.
 *
 * LABEL WIDTH WAS MEASURED, NOT GUESSED. Advance widths were summed from the
 * bundled Noto Sans and Noto Sans Devanagari 500 files. Expo Router's vendored
 * bottom tabs give each item flex: 1 and 5pt of padding a side, with a
 * single-line label that truncates rather than wraps — so on a 360dp phone a
 * label has 62dp. At 13px every Hindi label fits comfortably (डैशबोर्ड is
 * 39.9px). The one label that did not fit was English "Dashboard" at 68.4px,
 * so the ENGLISH tab label is "Home"; the screen itself is still titled
 * Dashboard. The string was shortened, not the font.
 *
 * 12px against the customer app's 11px, on a 64dp bar plus the system inset,
 * which keeps each tab clear of the 48dp floor.
 *
 * Style objects are React Navigation's API — a navigator's bar has no
 * className, and a tab label is rendered by the navigator rather than by our
 * <Text>, so its font family must be set here or Devanagari falls back to the
 * system font. All values are tokens.
 */
const TABS = [
  { name: 'index', labelKey: 'worker.dashboard.tab', iconFocused: 'speedometer', iconIdle: 'speedometer-outline' },
  { name: 'bookings', labelKey: 'worker.bookings.tab', iconFocused: 'calendar', iconIdle: 'calendar-outline' },
  { name: 'earnings', labelKey: 'worker.earnings.tab', iconFocused: 'wallet', iconIdle: 'wallet-outline' },
  { name: 'chat', labelKey: 'worker.chat.tab', iconFocused: 'chatbubbles', iconIdle: 'chatbubbles-outline' },
  { name: 'profile', labelKey: 'worker.profile.tab', iconFocused: 'person-circle', iconIdle: 'person-circle-outline' },
] as const;

export default function TabsLayout() {
  const { t } = useTranslation();
  const script = useFontScript();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const unread = useUnreadTotal();
  // Job offers arrive and expire while the partner is anywhere in the app.
  useOfferDispatch();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          // Clears the gesture bar on phones that have one; a no-op on phones
          // with hardware keys, where the inset is 0.
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilies[script].semibold,
          fontSize: 12,
          // 1.5x, the leading every text size in this app uses, so a Devanagari
          // matra below the line is not cut off by the bar.
          lineHeight: 18,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            // Unread customer messages, on the Chat tab only.
            tabBarBadge: tab.name === 'chat' && unread > 0 ? unread : undefined,
            tabBarBadgeStyle: { backgroundColor: colors.danger, fontFamily: fontFamilies[script].semibold, fontSize: 11 },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.iconIdle} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
