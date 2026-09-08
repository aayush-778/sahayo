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

import { brandColors, FontScriptProvider, SCRIPT_FOR_LOCALE } from '@sahayo/ui-native';

import '../global.css';
import { DebugLanguageToggle } from '../src/components/DebugLanguageToggle';
import { initI18n } from '../src/i18n';
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
        <View className="flex-1" onLayout={onLayoutRootView}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              // React Navigation styles its own container; there is no
              // className for it. The value is a token, never a hex literal.
              contentStyle: { backgroundColor: brandColors.cream },
            }}
          />
          {/* The auth screens carry their own language switcher in the
              header, so the temporary debug pill stands down there rather
              than putting two language controls on the same screen. It stays
              everywhere else until profile/language.tsx is built. */}
          {segments[0] === '(auth)' ? null : <DebugLanguageToggle />}
        </View>
      </FontScriptProvider>
    </SafeAreaProvider>
  );
}
