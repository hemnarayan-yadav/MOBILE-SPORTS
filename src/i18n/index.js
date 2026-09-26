// Hermes has no Intl.PluralRules, which i18next needs for the `_one` / `_other`
// plural keys. This polyfill installs itself only where it is missing.
import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { env } from '../config/env.js';
import en from './locales/en.json';
import hi from './locales/hi.json';

// Same conventions as the web (frontend/src/i18n): keys namespaced by screen,
// English default, everyday colloquial Hindi. Shared keys carry the web's exact
// wording (checked by `npm run drift`); mobile-only keys live under `app.*`.
export const SUPPORTED_LOCALES = Object.freeze(['en', 'hi']);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  // The saved choice is applied once the UI preferences are restored
  // (store/uiStore.js), before the splash screen hides.
  lng: env.DEFAULT_LOCALE,
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LOCALES,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
