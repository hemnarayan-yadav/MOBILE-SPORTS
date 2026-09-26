// Adapted from frontend/src/api/client.js. The same error shape, single-flight
// refresh and 401 replay; what differs is the refresh-token transport. The web
// relies on an httpOnly cookie; a phone has no browser cookie jar, so the app
// names itself in a header (and sends no Origin), receives its refresh token in
// the response body and keeps it in the device keystore (lib/secureSession.js).
import axios from 'axios';
import { env } from '../config/env.js';
import { secureSession } from '../lib/secureSession.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';

const REQUEST_TIMEOUT_MS = 15_000;
const REFRESH_URL = '/auth/refresh';
// The API's switch to the native transport (backend modules/auth/sessionTransport.js).
export const NATIVE_CLIENT_HEADERS = Object.freeze({ 'X-KhelScore-Client': 'mobile' });
// An access token this close to expiry is renewed before a request goes out,
// so a request never has to fail with 401 first (the scorer's action would pay
// for a round trip).
export const PROACTIVE_REFRESH_MS = 60_000;

// These endpoints answer 401 for bad credentials or sessions. Refreshing and
// replaying them would loop or hide the real error.
const SESSION_URLS = new Set([
  '/auth/login',
  '/auth/otp/login',
  '/auth/otp/reset-password',
  '/auth/register',
  REFRESH_URL,
  '/auth/logout',
]);

// Central Axios instance. All module API files import this — do not create
// ad-hoc axios instances elsewhere.
export const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: NATIVE_CLIENT_HEADERS,
});

export const unwrap = (response) => response.data.data;

// Every downstream consumer sees the same error shape as on the web:
// `{ status, code, message, details }`, where `code` is the API's stable error
// code (or NETWORK_ERROR / HTTP_ERROR when the API gave none).
export function normalizeError(error) {
  const status = error.response?.status;
  const payload = error.response?.data;
  return {
    status: status ?? 0,
    code: payload?.error?.code ?? (status ? 'HTTP_ERROR' : 'NETWORK_ERROR'),
    message: payload?.error?.message ?? error.message ?? 'Request failed',
    details: payload?.error?.details,
  };
}

const sessionOver = () => ({ status: 401, code: 'INVALID_SESSION', message: 'No session' });

// A 401 from the refresh endpoint means the session is over; anything else
// (offline, timeout, server error) leaves it to be tried again later.
export const isSessionOver = (error) => error?.status === 401;

// Expiry (ms) read from the access token's own `exp` claim. Reading it needs no
// signature check: it only decides when to ask the server for a new token.
export function accessTokenExpiresAt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const { exp } = JSON.parse(atob(padded));
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// Begins a session from a sign-in answer. The refresh token is written to the
// keystore before the session is used, so a crash in between never leaves the
// app holding a token the device has not saved.
export async function startSession({ refreshToken, user, accessToken }) {
  await secureSession.saveRefreshToken(refreshToken);
  useAuthStore.getState().setSession({ user, accessToken });
}

// Ends the session on this device, always: the stored token is wiped even if
// the keystore complains, and the in-memory session is cleared.
export async function endSession() {
  try {
    await secureSession.clearRefreshToken();
  } finally {
    useAuthStore.getState().clear();
  }
}

let refreshInFlight = null;

// Exchanges the stored refresh token for a new session. Concurrent callers share
// one request. The rotated token is saved before the new access token is used;
// a session the server refuses (401) is ended on this device, while a network
// or server failure keeps the stored token for the next attempt.
export function refreshSession() {
  refreshInFlight ??= (async () => {
    const stored = await secureSession.readRefreshToken();
    if (!stored) throw sessionOver();
    try {
      const session = await apiClient.post(REFRESH_URL, { refreshToken: stored }).then(unwrap);
      await startSession(session);
      return session;
    } catch (error) {
      if (isSessionOver(error)) await endSession();
      throw error;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// Restores the session kept in the keystore (app start, or later when the
// device comes back online). A failure leaves the app signed out for now; only
// a refused session also wipes the stored token (see refreshSession).
export async function restoreSession() {
  try {
    await refreshSession();
  } catch {
    const store = useAuthStore.getState();
    if (store.status === AUTH_STATUS.UNKNOWN) store.clear();
  }
}

// Signing out tells the server (best effort: offline, or already revoked) and
// then always ends the session on this device.
export async function signOut() {
  try {
    const refreshToken = await secureSession.readRefreshToken();
    if (refreshToken) await apiClient.post('/auth/logout', { refreshToken });
  } catch {
    // The device forgets the session regardless.
  } finally {
    await endSession();
  }
}

async function renewIfExpiring(config) {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken || SESSION_URLS.has(config.url)) return;
  const expiresAt = accessTokenExpiresAt(accessToken);
  if (expiresAt && expiresAt - Date.now() < PROACTIVE_REFRESH_MS) {
    // A failed renewal is not fatal here: the request goes out with the token
    // it has, and a 401 takes the usual refresh-and-replay path.
    await refreshSession().catch(() => null);
  }
}

apiClient.interceptors.request.use(async (config) => {
  await renewIfExpiring(config);
  const { accessToken } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401, refresh once and replay the original request with the new token.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const shouldRefresh =
      error.response?.status === 401 &&
      original &&
      !original.retriedAfterRefresh &&
      !SESSION_URLS.has(original.url);

    if (!shouldRefresh) return Promise.reject(normalizeError(error));

    original.retriedAfterRefresh = true;
    try {
      await refreshSession();
    } catch {
      return Promise.reject(normalizeError(error));
    }
    return apiClient(original);
  },
);
