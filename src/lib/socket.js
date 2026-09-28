// Adapted from frontend/src/lib/socket.js: one shared public socket for live
// match rooms. React Native speaks WebSocket natively, so there is no HTTP
// long-polling fallback (the backend accepts native connections as they are —
// M0 spike). The authenticated socket for notification pushes is separate: it
// carries the access token and follows it.
//
// A phone in the background should not hold a connection (battery, data): the
// socket closes BACKGROUND_DISCONNECT_MS after the app leaves the foreground,
// and on return it reconnects — or, if it never closed, the match screens ask
// for a fresh snapshot (`onResume`), since updates may have been missed while
// the app was paused.
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { env } from '../config/env.js';

export const BACKGROUND_DISCONNECT_MS = 30_000;

let matchSocket = null;
let backgroundTimer = null;
const resumeListeners = new Set();

function onAppStateChange(state) {
  if (!matchSocket) return;
  if (state === 'active') {
    clearTimeout(backgroundTimer);
    backgroundTimer = null;
    if (matchSocket.connected) resumeListeners.forEach((listener) => listener());
    // A socket closed in the background reconnects; its `connect` handlers
    // re-join the rooms and resynchronise.
    else matchSocket.connect();
    return;
  }
  if (state === 'background' && !backgroundTimer) {
    backgroundTimer = setTimeout(() => {
      backgroundTimer = null;
      matchSocket?.disconnect();
    }, BACKGROUND_DISCONNECT_MS);
  }
}

export function getMatchSocket() {
  if (!matchSocket) {
    matchSocket = io(`${env.SOCKET_URL}/matches`, { transports: ['websocket'] });
    AppState.addEventListener('change', onAppStateChange);
  }
  return matchSocket;
}

// Authenticated socket for notification pushes; recreated when the token
// changes. Unlike the match socket it is not shared: the hook that opens it
// closes it when the session ends.
export function createUserSocket(token) {
  return io(env.SOCKET_URL, { auth: { token }, transports: ['websocket'] });
}

// Called when the app returns to the foreground with the socket still open.
export function onResume(listener) {
  resumeListeners.add(listener);
  return () => resumeListeners.delete(listener);
}
