// The web's type (frontend/src/main.jsx, tailwind.config.js): Barlow Condensed
// for display and numbers, Inter for text, Noto Sans Devanagari for Hindi.
// Each weight is imported from its own entry point so only these files are
// bundled (the packages' index files pull in every weight).
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';

export const FONT_ASSETS = Object.freeze({
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
});

// React Native has no CSS font stacks, so Hindi text is set in Noto Sans
// Devanagari explicitly instead of relying on per-glyph fallback. Numbers and
// scores stay in Barlow Condensed in both languages, as on the web.
const TEXT_FAMILIES = Object.freeze({
  en: { regular: 'Inter_400Regular', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' },
  hi: {
    regular: 'NotoSansDevanagari_400Regular',
    semibold: 'NotoSansDevanagari_600SemiBold',
    bold: 'NotoSansDevanagari_700Bold',
  },
});

const DISPLAY_FAMILIES = Object.freeze({
  semibold: 'BarlowCondensed_600SemiBold',
  bold: 'BarlowCondensed_700Bold',
});

export function fontFamily({ language = 'en', weight = 'regular', display = false } = {}) {
  if (display) return DISPLAY_FAMILIES[weight] ?? DISPLAY_FAMILIES.bold;
  const families = TEXT_FAMILIES[language] ?? TEXT_FAMILIES.en;
  return families[weight] ?? families.regular;
}
