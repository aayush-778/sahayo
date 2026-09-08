import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';

/**
 * Sahayo ships exactly two languages and no fallback chain beyond English.
 *
 * The list is `as const` so `AppLanguage` is a union of literals rather than
 * `string` — adding a third language then becomes a compile error at every
 * exhaustive switch instead of a silent gap in the UI.
 */
export const SUPPORTED_LANGUAGES = ['en', 'hi'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Where the user's explicit choice is persisted. */
export const LANGUAGE_STORAGE_KEY = 'sahayo.language';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
} as const;

function isSupported(value: string | null | undefined): value is AppLanguage {
  return value === 'en' || value === 'hi';
}

/**
 * The device's language, narrowed to what we ship.
 *
 * Anything that is not Hindi becomes English — a Marathi or Bengali device
 * gets English rather than a half-translated Hindi UI.
 */
function detectDeviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode;
  return code === 'hi' ? 'hi' : 'en';
}

async function readStoredLanguage(): Promise<AppLanguage | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupported(stored) ? stored : null;
  } catch {
    // A storage read can fail on a device with no writable app data. Falling
    // back to device detection is strictly better than refusing to boot.
    return null;
  }
}

/**
 * Initialises i18next and resolves to the language it settled on.
 *
 * This is awaited by the root layout BEFORE the first render. i18next can
 * technically change language after mount, but doing it that way means the
 * first frame is English and the second is Hindi — a visible flash on every
 * cold start for exactly the users who chose Hindi.
 *
 * Safe to call more than once; a Fast Refresh that re-runs the effect will
 * hit the `isInitialized` guard rather than re-registering the plugin.
 */
export async function initI18n(): Promise<AppLanguage> {
  const language = (await readStoredLanguage()) ?? detectDeviceLanguage();

  if (i18n.isInitialized) {
    if (i18n.language !== language) await i18n.changeLanguage(language);
    return language;
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: 'translation',
    interpolation: {
      // React escapes for us; letting i18next escape as well double-encodes
      // anything containing an ampersand.
      escapeValue: false,
    },
    returnNull: false,
  });

  return language;
}

/**
 * Switches language and persists the choice.
 *
 * This is the only writer of `sahayo.language`. The auth store mirrors the
 * value for rendering, but delegates the actual change here so there is one
 * place where the stored key and the live i18next instance move together.
 */
export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The language still changed for this session; it just will not survive
    // a restart. Not worth failing the interaction over.
  }
}

/** The live language, narrowed. Falls back to English for an unknown value. */
export function currentLanguage(): AppLanguage {
  return isSupported(i18n.language) ? i18n.language : 'en';
}

export default i18n;
