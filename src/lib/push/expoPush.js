// Everything the phone side of push notifications needs from the platform:
// permission, Android channels and the device's push token. This is the only
// file that calls expo-notifications' token and permission APIs — screens and
// hooks go through `hooks/usePush.js`.
//
// Push needs an EAS project id (`extra.eas.projectId`, written by `eas init`)
// and, at build time, Firebase credentials uploaded to EAS. Until the owner has
// set those up, `pushSupport()` reports `unavailable` and nothing here throws:
// the app runs exactly as before, minus notifications.
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Why push cannot be used, or `null` when it can.
export const PUSH_BLOCKERS = Object.freeze({
  // The build has no EAS project id: no token can be asked for at all.
  UNAVAILABLE: 'unavailable',
  // The person said no, or Android switched notifications off for the app.
  DENIED: 'denied',
});

// Android groups notifications by channel, and its own settings screen lists
// them by name, so each kind can be silenced separately. The ids match the
// channels the server sends on (backend modules/push/push.service.js).
const CHANNELS = Object.freeze([
  { id: 'matches', labelKey: 'app.channelMatches' },
  { id: 'registrations', labelKey: 'app.channelRegistrations' },
  { id: 'account', labelKey: 'app.channelAccount' },
]);

// A notification that arrives while the app is open is handled in-app (the
// socket already shows a notice), so the system banner would be a duplicate.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function projectId() {
  return Constants.expoConfig?.extra?.eas?.projectId ?? null;
}

/** Whether this build can ask for a push token at all. */
export const isPushSupported = () => Boolean(projectId());

/**
 * Creates (or updates) the Android channels, named in the app's language. Safe
 * to call again: the same ids are reused, so switching language renames them
 * rather than adding more. A no-op on other platforms.
 */
export async function ensureChannels(t) {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    CHANNELS.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: t(channel.labelKey),
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
    ),
  );
}

/** `granted` | `denied` | `undetermined` — what the system says right now. */
export async function permissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Asks for permission if it has never been asked, and resolves with whether
 * notifications may be shown. Android only prompts once: after a refusal the
 * system answers immediately, which is why the app asks at a moment that
 * explains itself (the first follow) rather than at launch.
 */
export async function requestPermission() {
  const existing = await permissionStatus();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * The device's Expo push token, or null when it cannot be had: no project id,
 * no permission, an emulator without Google Play services, or Expo's service
 * unreachable. Never throws — push is optional everywhere.
 */
export async function getPushToken() {
  const id = projectId();
  if (!id) return null;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    return data ?? null;
  } catch {
    // Offline, no Play services, or credentials not uploaded yet. The next
    // start tries again.
    return null;
  }
}

/** Calls `listener(data)` when a notification is tapped while the app runs. */
export function onNotificationTapped(listener) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
    listener(response.notification.request.content.data ?? {}),
  );
  return () => subscription.remove();
}

// The tap that started the app, so a cold start opens the right screen. Expo
// keeps it for the session; `undefined` means "not known yet", `null` means the
// app was not started by a notification.
export const useTappedNotification = () => Notifications.useLastNotificationResponse();
