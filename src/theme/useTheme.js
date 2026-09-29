// Adapted from frontend/src/hooks/useTheme.js. The web toggles a `dark` class on
// <html>; here the resolved scheme picks the token set directly. Since
// launch-readiness item #3 the store only ever holds 'light' or 'dark' — the
// resolver still tolerates an unexpected value in case an older build's
// AsyncStorage entry has not been migrated yet.
import { useColorScheme } from 'react-native';
import { THEMES, useUiStore } from '../store/uiStore.js';
import { COLORS } from './tokens.js';

// light | dark, following the operating system for any legacy value.
export function resolveScheme(theme, systemScheme) {
  if (theme === 'light' || theme === 'dark') return theme;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const scheme = resolveScheme(theme, useColorScheme());
  // Toggle between Light and Dark. The store enforces the value, so any legacy
  // 'system' resolves to `scheme` and flips to the opposite.
  const toggle = () => setTheme(scheme === 'dark' ? 'light' : 'dark');
  return { theme, scheme, colors: COLORS[scheme], setTheme, toggle, cycle: toggle, THEMES };
}
