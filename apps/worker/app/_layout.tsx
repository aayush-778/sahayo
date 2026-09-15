import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
  THEME_COLORS,
  ThemeProvider,
} from '@sahayo/ui-native';

import '../global.css';
import { resolveGate } from '../src/navigation/gate';
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
          <View className="flex-1" onLayout={onLayoutRootView}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                // A navigator's container has no className. The value is a token.
                contentStyle: { backgroundColor: THEME_COLORS.worker.ground },
              }}
            />
          </View>
        </FontScriptProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
