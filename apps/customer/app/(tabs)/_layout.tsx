import { useTranslation } from 'react-i18next';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { brandColors, fontFamilies, useFontScript } from '@sahayo/ui-native';

/**
 * The five-tab bar.
 *
 * Icons are Ionicons from @expo/vector-icons, which ships with Expo — no
 * extra font to load and nothing to configure. Each tab names its filled and
 * outline variant and swaps on focus, which reads faster than a colour change
 * alone at tab-bar size.
 *
 * Labels come from `common.tabs.*`, so the bar switches language live.
 *
 * The style objects below are React Navigation's own API surface. There is no
 * className for a navigator's bar, and the label's font family in particular
 * cannot be set any other way — a tab label is rendered by the navigator, not
 * by our <Text>, so it would otherwise fall back to the system font and be
 * the one piece of Devanagari on screen in the wrong face. Values are tokens.
 */
const TABS = [
  { name: 'index', labelKey: 'common.tabs.home', iconFocused: 'home', iconIdle: 'home-outline' },
  {
    name: 'categories',
    labelKey: 'common.tabs.categories',
    iconFocused: 'grid',
    iconIdle: 'grid-outline',
  },
  {
    name: 'bookings',
    labelKey: 'common.tabs.bookings',
    iconFocused: 'receipt',
    iconIdle: 'receipt-outline',
  },
  {
    name: 'support',
    labelKey: 'common.tabs.support',
    iconFocused: 'chatbubble-ellipses',
    iconIdle: 'chatbubble-ellipses-outline',
  },
  {
    name: 'profile',
    labelKey: 'common.tabs.profile',
    iconFocused: 'person-circle',
    iconIdle: 'person-circle-outline',
  },
] as const;

export default function TabsLayout() {
  const { t } = useTranslation();
  const script = useFontScript();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brandColors.primary,
        tabBarInactiveTintColor: brandColors.muted,
        tabBarStyle: {
          backgroundColor: brandColors.surface,
          borderTopColor: brandColors.border,
          // The bar must clear the system navigation area. On a gesture-nav
          // Android phone `insets.bottom` is the height of the home pill, and
          // without it the labels sit underneath it and are unreadable. On a
          // device with hardware keys the inset is 0 and this is a no-op, so
          // there is no second case to special-case.
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamilies[script].medium,
          fontSize: 11,
          // Devanagari tab labels are taller than Latin ones; without the
          // extra leading the descender of "श्रेणियाँ" is clipped by the bar.
          lineHeight: 16,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.iconIdle} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
