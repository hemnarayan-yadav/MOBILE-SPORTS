import { focusManager, onlineManager } from '@tanstack/react-query';
import { addNetworkStateListener } from 'expo-network';
import { AppState } from 'react-native';

// Tells TanStack Query what "focused" and "online" mean in a native app, which
// has no window focus or browser online events:
// - focused = the app is in the foreground. Polling (refetchInterval) pauses
//   in the background and stale queries refetch on return.
// - online = the device reports a connection. Queries pause while offline and
//   resume when the connection comes back.

export const isForeground = (appState) => appState === 'active';

// `isInternetReachable` is null while unknown; only an explicit false counts.
export const isOnline = (state) =>
  state.isConnected !== false && state.isInternetReachable !== false;

let started = false;

export function startAppLifecycle() {
  if (started) return;
  started = true;

  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) =>
      handleFocus(isForeground(state)),
    );
    return () => subscription.remove();
  });

  onlineManager.setEventListener((setOnline) => {
    const subscription = addNetworkStateListener((state) => setOnline(isOnline(state)));
    return () => subscription.remove();
  });
}
