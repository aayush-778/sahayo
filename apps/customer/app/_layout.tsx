import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, useRouter, useSegments, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_500Medium } from '@expo-google-fonts/noto-sans/500Medium';
import { NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans/600SemiBold';
import { NotoSans_700Bold } from '@expo-google-fonts/noto-sans/700Bold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_500Medium } from '@expo-google-fonts/noto-sans-devanagari/500Medium';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';

import { brandColors, FontScriptProvider, SCRIPT_FOR_LOCALE, Text } from '@sahayo/ui-native';

import '../global.css';
import { initI18n } from '../src/i18n';
import { ConnectionBanner, useConnectionNotice } from '../src/components/ConnectionBanner';
import { useRealtimeSession } from '../src/services/live';
import { useAuthStore } from '../src/store/auth';

/**
 * Hold the native splash until i18n, fonts and the persisted store are all
 * ready. Everything below hangs off that single gate.
 *
 * The alternative — render immediately and swap things in as they resolve —
 * produces a visible cascade on every cold start: English text in the system
 * font, then the right font, then Hindi. Each of those is a frame the user
 * sees. Holding the splash for the same total time shows none of them.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or the module is unavailable in this runtime. Neither is
  // worth failing a launch over.
});

/**
 * Both scripts, four weights each.
 *
 * Weights are separate FILES, not a synthesised bold: Android does not
 * synthesise weights for a custom family. Asking for `fontWeight: 700` on a
 * family that only registered its regular file gets you regular, silently.
 * `<Text weight="bold">` therefore maps to a family name, not to a weight.
 */
const FONTS = {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
};

/**
 * Routes a signed-out user is allowed to reach.
 *
 * The signup screen links to Terms & Conditions from beside its consent
 * checkbox. Without this exception the gate would bounce that tap straight
 * back to signup — you would be asked to agree to something you are not
 * allowed to read.
 */
function isPublicRoute(segments: string[]): boolean {
  return segments[0] === 'profile' && (segments[1] === 'terms' || segments[1] === 'privacy');
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const [i18nReady, setI18nReady] = useState(false);

  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const language = useAuthStore((state) => state.language);

  const router = useRouter();
  const segments = useSegments();

  // The live connection opens while someone is signed in, and closes on sign-out.
  useRealtimeSession();

  useEffect(() => {
    let cancelled = false;
    initI18n()
      .then((resolved) => {
        if (cancelled) return;
        // Seed the store from whatever i18n settled on. src/i18n owns the
        // persisted key; the store only mirrors it for rendering.
        useAuthStore.getState().syncLanguage(resolved);
        setI18nReady(true);
      })
      .catch(() => {
        // A catalogue that will not load is not recoverable by retrying, and
        // a permanently blank screen is worse than an untranslated one.
        if (!cancelled) setI18nReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // `fontError` counts as ready: a device that cannot load the font files
  // should still show the app in a system font rather than never boot.
  const ready = i18nReady && hasHydrated && (fontsLoaded || fontError !== null);

  const onLayoutRootView = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  /**
   * The auth gate.
   *
   * Runs only once `ready` is true, and `ready` includes store rehydration —
   * otherwise `isAuthenticated` is still its default `false` on the first
   * frame and an already-signed-up user gets bounced to signup on every
   * launch.
   */
  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup && !isPublicRoute(segments)) {
      router.replace('/signup');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [ready, isAuthenticated, segments, router]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <FontScriptProvider script={SCRIPT_FOR_LOCALE[language]}>
        <AppShell onLayout={onLayoutRootView} />
      </FontScriptProvider>
    </SafeAreaProvider>
  );
}

/**
 * Everything under the safe-area provider: the connection strip, and the navigator below it.
 *
 * Its own component because the insets can only be read inside the provider, and because
 * the strip changes what the screens under it should use: while it is up it has already
 * covered the status bar, so the screens must not add that inset a second time — they
 * would sit a status bar's height too low. Zeroing the top inset here is what keeps every
 * screen in the same place whether the strip is showing or not.
 */
function AppShell({ onLayout }: { onLayout: () => void }) {
  const notice = useConnectionNotice();
  const insets = useSafeAreaInsets();
  const belowBanner = useMemo(() => (notice ? { ...insets, top: 0 } : insets), [notice, insets]);

  return (
    <View className="flex-1" onLayout={onLayout}>
      <StatusBar style="dark" />
      <ConnectionBanner notice={notice} />
      <SafeAreaInsetsContext.Provider value={belowBanner}>
        <Stack
          screenOptions={{
            headerShown: false,
            // React Navigation styles its own container; there is no
            // className for it. The value is a token, never a hex literal.
            contentStyle: { backgroundColor: brandColors.cream },
          }}
        />
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

/**
 * The last line of defence: a screen that throws shows this card instead of a red box of
 * stack trace. Retry remounts the route, which is enough for anything transient — and on
 * stage it is a card a judge can look at rather than a wall of file paths.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-cream px-8">
      <Text weight="bold" className="text-center text-lg text-brand-navy">
        Something went wrong
      </Text>
      <Text className="mt-2 text-center text-sm text-brand-muted">
        This screen could not be shown. Your bookings are safe.
      </Text>
      <Text className="mt-3 text-center text-xs text-brand-muted">{error.message}</Text>
      <Pressable
        className="mt-6 h-12 items-center justify-center rounded-xl bg-brand-primary px-6"
        onPress={() => void retry()}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text weight="semibold" className="text-base text-white">
          Try again
        </Text>
      </Pressable>
    </View>
  );
}
