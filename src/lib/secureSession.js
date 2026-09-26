import * as SecureStore from 'expo-secure-store';

// The only place the refresh token is stored: the device keystore (Android
// Keystore-backed encryption; Keychain on iOS later), never AsyncStorage, never
// the auth store, never a log line. This is the only file that uses
// expo-secure-store. The access token is kept in memory only (store/authStore.js).
//
// On iOS the item is readable once the device has been unlocked after a boot and
// never leaves this device (no iCloud Keychain sync, no backup restore onto
// another phone). Android auto-backup is configured by the expo-secure-store
// config plugin so a restored backup never carries an undecryptable token.
const REFRESH_TOKEN_KEY = 'khelscore.refreshToken';
const OPTIONS = Object.freeze({
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
});

export const secureSession = Object.freeze({
  readRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY, OPTIONS),
  saveRefreshToken: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, OPTIONS),
  clearRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, OPTIONS),
});
