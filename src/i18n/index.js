// Hermes has no Intl.PluralRules, which i18next needs for the `_one` / `_other`
// plural keys. This polyfill installs itself only where it is missing.
import 'intl-pluralrules';
import i18n from 'i18next';
import { getLocales } from 'expo-localization';
import { initReactI18next } from 'react-i18next';
import { env } from '../config/env.js';
import en from './locales/en.json';
import hi from './locales/hi.json';

// Same conventions as the web (frontend/src/i18n): keys namespaced by screen,
// English default, everyday colloquial Hindi. Shared keys carry the web's exact
// wording (checked by `npm run drift`); mobile-only keys live under `app.*`.
export const SUPPORTED_LOCALES = Object.freeze(['en', 'hi']);

/**
 * The first language the phone asks for that the app has.
 *
 * A phone set to Hindi opens in Hindi — most of the people this app is for
 * will never go looking for a toggle — and the toggle still wins whenever they
 * have used it, exactly as the theme follows the system until it is set
 * (store/uiStore.js). Only the language part is read, so "hi-IN" is Hindi, and
 * anything the app does not have falls through to the default rather than to a
 * half-translated screen.
 */
export function deviceLanguage() {
  try {
    for (const locale of getLocales()) {
      const language = String(locale?.languageCode ?? '').toLowerCase();
      if (SUPPORTED_LOCALES.includes(language)) return language;
    }
  } catch {
    // A platform that cannot say keeps the default.
  }
  return null;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  // The phone's own language to begin with; the saved choice is applied once
  // the UI preferences are restored (store/uiStore.js), before the splash
  // screen hides, and wins whenever there is one.
  lng: deviceLanguage() ?? env.DEFAULT_LOCALE,
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LOCALES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
