// Adapted from frontend/src/hooks/useTheme.js. The web toggles a `dark` class on
// <html>; here the resolved scheme picks the token set directly.
import { useColorScheme } from 'react-native';
import { THEMES, useUiStore } from '../store/uiStore.js';
import { COLORS } from './tokens.js';

// light | dark, following the operating system while the theme is "system".
export function resolveScheme(theme, systemScheme) {
  if (theme === 'light' || theme === 'dark') return theme;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const scheme = resolveScheme(theme, useColorScheme());
  const cycle = () => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
  return { theme, scheme, colors: COLORS[scheme], setTheme, cycle };
}
