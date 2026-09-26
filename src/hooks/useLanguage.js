// Adapted from frontend/src/hooks/useLanguage.js.
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LOCALES } from '../i18n/index.js';
import { useUiStore } from '../store/uiStore.js';

export function useLanguage() {
  const { i18n } = useTranslation();
  const setLanguage = useUiStore((s) => s.setLanguage);
  return {
    current: i18n.language,
    supported: SUPPORTED_LOCALES,
    change: (lng) => {
      if (!SUPPORTED_LOCALES.includes(lng)) return;
      i18n.changeLanguage(lng);
      setLanguage(lng);
    },
  };
}
