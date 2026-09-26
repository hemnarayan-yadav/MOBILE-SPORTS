// Adapted from frontend/src/store/uiStore.js: the same preferences and storage
// key, persisted in AsyncStorage instead of localStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const THEMES = Object.freeze(['light', 'dark', 'system']);
export const UI_STORAGE_KEY = 'lk-ui';

// Client-only UI preferences. Theme and language survive restarts. Restoring
// them is asynchronous, so the root layout keeps the splash screen up until
// `hasHydrated` is true and the first frame already uses the saved choice.
export const useUiStore = create(
  persist(
    (set) => ({
      theme: 'system',
      language: null,
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, language }) => ({ theme, language }),
      onRehydrateStorage: () => () => useUiStore.setState({ hasHydrated: true }),
    },
  ),
);
