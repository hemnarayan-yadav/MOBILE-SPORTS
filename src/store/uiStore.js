// Adapted from frontend/src/store/uiStore.js: the same preferences and storage
// key, persisted in AsyncStorage instead of localStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Explicit only (launch-readiness item #3): the toggle picks Light or Dark;
// "System" was dropped. Rehydration below migrates a saved 'system' choice to
// whatever the phone is showing right then, so nobody's preference vanishes.
export const THEMES = Object.freeze(['light', 'dark']);
export const UI_STORAGE_KEY = 'lk-ui';

function currentSystemScheme() {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

// Client-only UI preferences. Theme and language survive restarts. Restoring
// them is asynchronous, so the root layout keeps the splash screen up until
// `hasHydrated` is true and the first frame already uses the saved choice. A
// saved 'system' from an older build is migrated once on rehydrate.
export const useUiStore = create(
  persist(
    (set) => ({
      theme: currentSystemScheme(),
      language: null,
      // Whether the notification permission has already been offered (on the
      // first follow). Android prompts only once, so the app asks once too.
      pushPrimed: false,
      hasHydrated: false,
      setTheme: (theme) => {
        if (THEMES.includes(theme)) set({ theme });
      },
      setLanguage: (language) => set({ language }),
      setPushPrimed: () => set({ pushPrimed: true }),
    }),
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, language, pushPrimed }) => ({ theme, language, pushPrimed }),
      onRehydrateStorage: () => (state) => {
        // A previous build persisted 'system'; keep the user's actual current
        // preference by pinning it to the resolved scheme at first restore.
        if (state && !THEMES.includes(state.theme)) {
          useUiStore.setState({ theme: currentSystemScheme() });
        }
        useUiStore.setState({ hasHydrated: true });
      },
    },
  ),
);
