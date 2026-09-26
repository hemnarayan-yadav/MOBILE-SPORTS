// The native session: refresh token in the keystore, rotation saved before use,
// single-flight refresh, 401 replay, proactive renewal, sign-out that always
// wipes, and restoring a session after an offline start.
import * as SecureStore from 'expo-secure-store';
import {
  NATIVE_CLIENT_HEADERS,
  accessTokenExpiresAt,
  apiClient,
  refreshSession,
  restoreSession,
  signOut,
  startSession,
} from '../api/client.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { REFRESH_KEY, accessTokenExpiringIn, fail, fakeApi, ok, resetSession } from './helpers.jsx';

const USER = { id: 'u1', name: 'Asha', role: 'user' };
let api;

beforeEach(() => resetSession());
afterEach(() => api?.restore());

function sessionAnswer(label) {
  return ok({
    user: USER,
    accessToken: accessTokenExpiringIn(900, label),
    refreshToken: `rt-${label}`,
  });
}

describe('starting a session', () => {
  it('names the app on every request, so the API answers with body tokens', () => {
    expect(apiClient.defaults.headers['X-KhelScore-Client']).toBe(
      NATIVE_CLIENT_HEADERS['X-KhelScore-Client'],
    );
  });

  it('writes the refresh token to the keystore before the session is used', async () => {
    const order = [];
    SecureStore.setItemAsync.mockImplementationOnce(async (key, value) => {
      order.push('saved');
      SecureStore.__store.set(key, value);
    });
    const unsubscribe = useAuthStore.subscribe(() => order.push('session'));

    await startSession({ user: USER, accessToken: 'at', refreshToken: 'rt-1' });
    unsubscribe();

    expect(order).toEqual(['saved', 'session']);
    expect(SecureStore.__store.get(REFRESH_KEY)).toBe('rt-1');
    // The refresh token never enters the in-memory store.
    expect(JSON.stringify(useAuthStore.getState())).not.toContain('rt-1');
  });
});

describe('refreshing', () => {
  it('sends the stored token in the body and keeps the rotated one', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-old');
    api = fakeApi(() => sessionAnswer('new'));

    await refreshSession();

    expect(api.calls[0]).toMatchObject({ url: '/auth/refresh', body: { refreshToken: 'rt-old' } });
    expect(SecureStore.__store.get(REFRESH_KEY)).toBe('rt-new');
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.AUTHENTICATED);
  });

  it('shares one request between concurrent callers', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-old');
    api = fakeApi(() => sessionAnswer('new'));

    await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(api.calls.filter((c) => c.url === '/auth/refresh')).toHaveLength(1);
  });

  it('ends the session and wipes the keystore when the server refuses it', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-old');
    useAuthStore.getState().setSession({ user: USER, accessToken: 'at' });
    api = fakeApi(() => fail(401, 'INVALID_SESSION'));

    await expect(refreshSession()).rejects.toMatchObject({ code: 'INVALID_SESSION' });
    expect(SecureStore.__store.has(REFRESH_KEY)).toBe(false);
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.ANONYMOUS);
  });

  it('keeps the stored token when the network fails', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-old');
    api = fakeApi(() => {
      throw new Error('Network Error');
    });

    await expect(refreshSession()).rejects.toBeTruthy();
    expect(SecureStore.__store.get(REFRESH_KEY)).toBe('rt-old');
  });
});

describe('requests', () => {
  it('replays a request after a 401 with the refreshed token', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-old');
    useAuthStore.getState().setSession({ user: USER, accessToken: 'expired' });
    api = fakeApi(({ url, headers }) => {
      if (url === '/auth/refresh') return sessionAnswer('fresh');
      return headers.Authorization === 'Bearer expired'
        ? fail(401, 'TOKEN_EXPIRED')
        : ok({ me: 1 });
    });

    const res = await apiClient.get('/users/me');
    expect(res.data.data).toEqual({ me: 1 });
    expect(api.calls.map((c) => c.url)).toEqual(['/users/me', '/auth/refresh', '/users/me']);
  });

  it('renews an access token about to expire before sending the request', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-old');
    useAuthStore.getState().setSession({ user: USER, accessToken: accessTokenExpiringIn(20) });
    api = fakeApi(({ url }) => (url === '/auth/refresh' ? sessionAnswer('fresh') : ok({})));

    await apiClient.get('/users/me');
    expect(api.calls.map((c) => c.url)).toEqual(['/auth/refresh', '/users/me']);
    expect(api.calls[1].headers.Authorization).toMatch(/^Bearer .*sig-fresh$/);
  });

  it('does not renew a token with time to spare', async () => {
    useAuthStore.getState().setSession({ user: USER, accessToken: accessTokenExpiringIn(600) });
    api = fakeApi(() => ok({}));
    await apiClient.get('/users/me');
    expect(api.calls.map((c) => c.url)).toEqual(['/users/me']);
  });

  it('reads the expiry from the token and tolerates a malformed one', () => {
    const token = accessTokenExpiringIn(300);
    expect(accessTokenExpiresAt(token)).toBeGreaterThan(Date.now() + 290_000);
    expect(accessTokenExpiresAt('not-a-token')).toBeNull();
  });
});

describe('signing out', () => {
  it('revokes the session on the server with the stored token and wipes it', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-1');
    useAuthStore.getState().setSession({ user: USER, accessToken: 'at' });
    api = fakeApi(() => ok(null));

    await signOut();
    expect(api.calls[0]).toMatchObject({ url: '/auth/logout', body: { refreshToken: 'rt-1' } });
    expect(SecureStore.__store.has(REFRESH_KEY)).toBe(false);
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.ANONYMOUS);
  });

  it('still wipes the device when the server cannot be reached', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-1');
    useAuthStore.getState().setSession({ user: USER, accessToken: 'at' });
    api = fakeApi(() => {
      throw new Error('Network Error');
    });

    await signOut();
    expect(SecureStore.__store.has(REFRESH_KEY)).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('restoring at start-up', () => {
  it('is signed out at once when nothing is stored, without calling the API', async () => {
    api = fakeApi(() => ok({}));
    await restoreSession();
    expect(api.calls).toHaveLength(0);
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.ANONYMOUS);
  });

  it('restores a stored session', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-old');
    api = fakeApi(() => sessionAnswer('new'));
    await restoreSession();
    expect(useAuthStore.getState()).toMatchObject({
      status: AUTH_STATUS.AUTHENTICATED,
      user: USER,
    });
  });

  it('starts signed out but keeps the token when offline, and restores it later', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-old');
    let online = false;
    api = fakeApi(() => {
      if (!online) throw new Error('Network Error');
      return sessionAnswer('new');
    });

    await restoreSession();
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.ANONYMOUS);
    expect(SecureStore.__store.get(REFRESH_KEY)).toBe('rt-old');

    online = true;
    await restoreSession();
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.AUTHENTICATED);
  });
});
