// Adapted from frontend/src/hooks/useAuthBootstrap.js.
import { focusManager, onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { restoreSession } from '../api/client.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';

const retryIfSignedOut = () => {
  if (useAuthStore.getState().status === AUTH_STATUS.ANONYMOUS) restoreSession();
};

// Restores the session from the keystore when the app starts. Public screens
// render immediately; account screens wait for the status to resolve. A start
// without a connection keeps the stored token, and the session is restored as
// soon as the device is back online or the app returns to the foreground.
export function useAuthBootstrap() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === AUTH_STATUS.UNKNOWN) restoreSession();
  }, [status]);

  useEffect(() => {
    const stopOnline = onlineManager.subscribe((online) => online && retryIfSignedOut());
    const stopFocus = focusManager.subscribe((focused) => focused && retryIfSignedOut());
    return () => {
      stopOnline();
      stopFocus();
    };
  }, []);

  return status;
}
