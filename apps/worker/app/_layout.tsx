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

import {
  FontScriptProvider,
  initI18n,
  SCRIPT_FOR_LOCALE,
  Text,
  THEME_COLORS,
  ThemeProvider,
} from '@sahayo/ui-native';

import '../global.css';
import { ConnectionBanner, useConnectionNotice } from '../src/components/ConnectionBanner';
import { resolveGate } from '../src/navigation/gate';
import { useRealtimeSession } from '../src/services';
import { useWorkerStore } from '../src/store/worker';

/**
 * Hold the native splash until i18n, fonts and the persisted partner record are
 * all ready.
 *
 * Rendering immediately and swapping things in as they resolve produces a
 * visible cascade on every cold start — English in the system font, then the
 * right font, then Hindi. For an app whose premise is that its users may not
 * read English, the first frame being English is the one frame to avoid.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unavailable in this runtime. Not worth failing a launch.
});

/**
 * Both scripts, four weights each. Weights are separate files, not a
 * synthesised bold: Android does not synthesise weights for a custom family, so
 * `<Text weight="bold">` maps to a family name.
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
 * The root layout: providers, the splash hold, and the two gates.
 *
 * The gate decision itself lives in src/navigation/gate.ts as a pure function —
 * this layout only feeds it state and acts on the answer. The store is read
 * directly here, the one place outside src/services that does, because the gate
 * must see `hasHydrated`: a fact about storage, not partner data. Until
 * rehydration settles every field is its default, and a gate that trusted
 * `isAuthenticated` then would bounce a signed-in partner to login on every
 * launch.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const [i18nReady, setI18nReady] = useState(false);

  const hasHydrated = useWorkerStore((state) => state.hasHydrated);
  const isAuthenticated = useWorkerStore((state) => state.isAuthenticated);
  const onboardingStep = useWorkerStore((state) => state.onboardingStep);
  const language = useWorkerStore((state) => state.language);

  const router = useRouter();
  const segments = useSegments();

  // The live connection opens while an approved partner is signed in, and closes otherwise.
  useRealtimeSession();

  useEffect(() => {
    let cancelled = false;
    initI18n()
      .then((resolved) => {
        if (cancelled) return;
        useWorkerStore.getState().syncLanguage(resolved);
        setI18nReady(true);
      })
      .catch(() => {
        // A catalogue that will not load is not fixed by retrying, and a blank
        // screen forever is worse than an untranslated one.
        if (!cancelled) setI18nReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A device that cannot load the font files still boots, in a system font.
  const ready = i18nReady && hasHydrated && (fontsLoaded || fontError !== null);

  const onLayoutRootView = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const target = resolveGate({ isAuthenticated, onboardingStep }, segments);
    if (target) router.replace(target);
  }, [ready, isAuthenticated, onboardingStep, segments, router]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider theme="worker">
        <FontScriptProvider script={SCRIPT_FOR_LOCALE[language]}>
          <AppShell onLayout={onLayoutRootView} />
        </FontScriptProvider>
      </ThemeProvider>
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
            // A navigator's container has no className. The value is a token.
            contentStyle: { backgroundColor: THEME_COLORS.worker.ground },
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
    <View className="flex-1 items-center justify-center bg-worker-ground px-8">
      <Text weight="bold" className="text-center text-lg text-worker-ink">
        Something went wrong
      </Text>
      <Text className="mt-2 text-center text-sm text-worker-muted">
        This screen could not be shown. Your work is safe on the cooperative's server.
      </Text>
      <Text className="mt-3 text-center text-xs text-worker-muted">{error.message}</Text>
      <Pressable
        className="mt-6 h-12 items-center justify-center rounded-xl bg-worker-primary px-6"
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
