import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';
import { pushApi } from '../api/push.api.js';
import {
  PUSH_BLOCKERS,
  ensureChannels,
  getPushToken,
  isPushSupported,
  onNotificationTapped,
  permissionStatus,
  requestPermission,
  useTappedNotification,
} from '../lib/push/expoPush.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';

// Push notifications for screens and the root layout.
//
// Nothing here is required for the app to work: without an EAS project id, a
// permission or a reachable Expo service, every call quietly does nothing and
// the app behaves exactly as it did before push existed.

const APP_VERSION = Constants.expoConfig?.version ?? null;

// The token this device last registered, so signing out can withdraw exactly
// that one and a repeated registration is not sent again.
let registeredToken = null;

async function registerThisDevice(locale) {
  if (!isPushSupported()) return null;
  if ((await permissionStatus()) !== 'granted') return null;
  const token = await getPushToken();
  if (!token || token === registeredToken) return token;
  try {
    await pushApi.register({
      token,
      platform: Platform.OS,
      locale,
      appVersion: APP_VERSION ?? undefined,
    });
    registeredToken = token;
  } catch {
    // Offline, or the session expired between the checks: the next start or
    // sign-in tries again. Push is never worth an error message here.
    return null;
  }
  return token;
}

/**
 * Registers this installation while somebody is signed in, and withdraws it on
 * the way out, so a phone that is no longer signed in stops being notified.
 * Mounted once, by the root layout.
 */
export function usePushRegistration() {
  const { t, i18n } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const language = i18n.language;

  useEffect(() => {
    if (status !== AUTH_STATUS.AUTHENTICATED) return;
    // The language is part of the registration: the server writes notification
    // text in it, so changing language re-registers.
    registerThisDevice(language);
    ensureChannels(t).catch(() => {});
  }, [status, language, t]);
}

/** Withdraws this device; called while signing out, before the session ends. */
export async function unregisterThisDevice() {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await pushApi.unregister(token);
  } catch {
    // The server also revokes every device of an account whose session ends,
    // so a failed withdrawal here is not the only safeguard.
  }
}

/**
 * Whether this device may show notifications, and how to change that.
 * `blocker` is one of PUSH_BLOCKERS or null; `ask()` prompts the first time and
 * afterwards resolves to the standing answer.
 */
export function usePushPermission() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState(null);

  const refresh = useCallback(async () => {
    const next = isPushSupported() ? await permissionStatus() : 'unsupported';
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ask = useCallback(async () => {
    if (!isPushSupported()) return false;
    const granted = await requestPermission();
    await refresh();
    if (granted) {
      await ensureChannels(t).catch(() => {});
      await registerThisDevice(i18n.language);
    }
    return granted;
  }, [refresh, t, i18n.language]);

  const blocker = (() => {
    if (status === null) return null; // not known yet
    if (status === 'unsupported') return PUSH_BLOCKERS.UNAVAILABLE;
    if (status === 'denied') return PUSH_BLOCKERS.DENIED;
    return null;
  })();

  return {
    status,
    blocker,
    granted: status === 'granted',
    canAsk: status === 'undetermined',
    ask,
    refresh,
    openSettings: () => Linking.openSettings(),
  };
}

// A tapped notification carries `{ type, link }` (backend push.service.js).
// The link is one of the app's own paths, so it is checked before it is used:
// nothing from outside the app ever decides where to navigate.
const isAppPath = (link) => typeof link === 'string' && /^\/[\w\-/]*$/.test(link);

/**
 * Opens the screen a tapped notification points at — whether the app was
 * already running or the tap started it.
 */
export function useNotificationTaps() {
  const router = useRouter();
  const lastResponse = useTappedNotification();
  const [coldStartHandled, setColdStartHandled] = useState(false);

  const open = useCallback(
    (data) => {
      if (isAppPath(data?.link)) router.push(data.link);
    },
    [router],
  );

  // The app was started by a tap: expo-notifications keeps that response for
  // the session, so it is opened once and then ignored.
  useEffect(() => {
    if (coldStartHandled || !lastResponse) return;
    setColdStartHandled(true);
    open(lastResponse.notification.request.content.data ?? {});
  }, [lastResponse, coldStartHandled, open]);

  // Taps while the app is running.
  useEffect(() => onNotificationTapped(open), [open]);
}
