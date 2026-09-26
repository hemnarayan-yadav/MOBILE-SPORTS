jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '0.1.0', android: { package: 'in.khelscore.app.dev' } } },
}));

import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Linking, Platform, Text } from 'react-native';
import Profile from '../app/dashboard/profile.jsx';
import UpdateGate from '../components/common/UpdateGate.jsx';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { REFRESH_KEY, fail, fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });

const PROFILE = {
  id: 'u1',
  name: 'Asha Devi',
  email: null,
  phone: '+919876543210',
  avatarUrl: null,
  role: 'user',
  status: 'active',
  emailVerified: false,
  phoneVerified: true,
  notificationPreferences: {
    matchUpdates: true,
    results: true,
    reminders: true,
    registrations: true,
    email: false,
  },
  updatedAt: '2026-09-26T00:00:00.000Z',
};
let api;

beforeEach(() => {
  resetSession();
  jest.clearAllMocks();
});
afterEach(() => api?.restore());

function profileApi() {
  return fakeApi(({ method, url, body }) => {
    if (url === '/users/me') return ok(PROFILE);
    if (url === '/otp/config') return ok({ available: true, flow: 'code', channel: 'whatsapp' });
    if (url === '/media/config') return ok({ enabled: true, maxImageMb: 5, maxVideoMb: 50 });
    if (method === 'patch' && url === '/users/me/notification-preferences') {
      return ok({
        ...PROFILE,
        notificationPreferences: { ...PROFILE.notificationPreferences, ...body },
      });
    }
    return ok(null);
  });
}

describe('Profile', () => {
  it('sends a signed-out visitor to sign in', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
    api = profileApi();
    await renderWithQuery(<Profile />);
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
    expect(api.calls.some((c) => c.url === '/users/me')).toBe(false);
  });

  it('shows the account, its verified number and the role', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    expect(await screen.findByText('Signed in as User')).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('Asha Devi');
    expect(screen.getByText('+91 9876543210')).toBeTruthy();
    expect(screen.getByText('Number verified')).toBeTruthy();
    expect(screen.getByText('No email address added')).toBeTruthy();
  });

  it('saves a notification preference as soon as it is switched', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await fireEvent(await screen.findByLabelText('Results'), 'valueChange', false);
    await waitFor(() =>
      expect(api.calls.find((c) => c.url === '/users/me/notification-preferences')?.body).toEqual({
        results: false,
      }),
    );
  });

  it('signs out: home first, then the session is revoked and wiped from the device', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-1');
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Log out' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/');
    await waitFor(() => expect(SecureStore.__store.has(REFRESH_KEY)).toBe(false));
    expect(api.calls.find((c) => c.url === '/auth/logout').body).toEqual({ refreshToken: 'rt-1' });
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.ANONYMOUS);
  });
});

// The API names a minimum per platform; the tests answer for the platform Jest
// simulates (jest-expo's default preset), so the gate logic is what is tested.
describe('Forced update (GET /mobile/config)', () => {
  const app = <Text>the app</Text>;
  const minimum = (version) => ok({ minSupportedVersion: { [Platform.OS]: version } });

  it('blocks an app older than the minimum and opens its store page', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    api = fakeApi(() => minimum('0.2.0'));
    await renderWithQuery(<UpdateGate>{app}</UpdateGate>);

    expect(await screen.findByText('Update KhelScore')).toBeTruthy();
    expect(screen.queryByText('the app')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Update now' }));
    expect(openURL).toHaveBeenCalledWith('market://details?id=in.khelscore.app.dev');
  });

  it('runs the app when it is new enough', async () => {
    api = fakeApi(() => minimum('0.1.0'));
    await renderWithQuery(<UpdateGate>{app}</UpdateGate>);
    await waitFor(() => expect(api.calls).toHaveLength(1));
    expect(screen.getByText('the app')).toBeTruthy();
  });

  it('never locks anyone out when the answer cannot be fetched', async () => {
    api = fakeApi(() => fail(503, 'NOT_READY'));
    await renderWithQuery(<UpdateGate>{app}</UpdateGate>);
    await waitFor(() => expect(api.calls).toHaveLength(1));
    expect(screen.getByText('the app')).toBeTruthy();
  });
});
