// Test-only configuration. These are placeholder values for the validated
// EXPO_PUBLIC_* settings (src/config/env.js); no test talks to a real server.
process.env.EXPO_PUBLIC_APP_ENV = 'development';
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:5000/api/v1';
process.env.EXPO_PUBLIC_SOCKET_URL = 'http://localhost:5000';
process.env.EXPO_PUBLIC_SITE_URL = 'https://www.khelscore.in';
process.env.EXPO_PUBLIC_DEFAULT_LOCALE = 'en';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Ionicons pulls in expo-font, which in turn requires expo-asset. Neither is
// used at runtime by the pure-vector glyph rendering path the app uses, but
// they run at import time. A tiny stub keeps the icon a plain Text node so
// tests can find labels and assertions on the icon-bearing buttons still work.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  const Ionicons = ({ name, accessibilityLabel }) =>
    createElement(Text, { accessibilityLabel, testID: `ionicon-${name}` }, '');
  return { __esModule: true, default: Ionicons };
});

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// The device keystore, in memory. `__store` lets a test inspect or seed it.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    getItemAsync: jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
    __store: store,
  };
});

// Navigation without a navigator: screens are rendered on their own, and tests
// assert on the shared `router` mock (import { router } from 'expo-router').
jest.mock('expo-router', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  };
  return {
    router,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    Link: ({ href, children }) =>
      createElement(
        Text,
        { accessibilityRole: 'link', onPress: () => router.push(href) },
        children,
      ),
    Redirect: ({ href }) => {
      router.replace(href);
      return null;
    },
  };
});
