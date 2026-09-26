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

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
