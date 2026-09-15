/**
 * The i18n bootstrap and both catalogues moved to @sahayo/ui-native in
 * sub-phase 4.0, so the worker app reads the same machinery and the same
 * en.json / hi.json rather than a copy of either.
 *
 * Re-exported here under every name this module always had, so the imports
 * across the customer app — the root layout, the auth store, the language
 * screen and the language switcher — are unchanged.
 */
export {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  currentLanguage,
  i18n as default,
  initI18n,
  setAppLanguage,
  type AppLanguage,
} from '@sahayo/ui-native';
