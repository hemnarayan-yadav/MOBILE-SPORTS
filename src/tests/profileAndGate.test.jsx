jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '0.1.0', android: { package: 'in.khelscore.app.dev' } } },
}));

import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, Text } from 'react-native';
import Profile from '../app/dashboard/profile.jsx';
import UpdateGate from '../components/common/UpdateGate.jsx';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { useNoticeStore } from '../store/noticeStore.js';
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

// Deleting the account from the app (M4). Google Play requires the app itself
// to offer it, so the whole flow is here.
describe('Delete account', () => {
  const openSheet = async () => {
    const buttons = await screen.findAllByRole('button', { name: 'Delete my account' });
    await fireEvent.press(buttons[0]);
  };
  const submitButton = () => screen.getAllByRole('button', { name: 'Delete my account' }).at(-1);

  it('says what is erased and what is kept, and opens the public page on the website', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    expect(await screen.findByText(/Erased: your name/)).toBeTruthy();
    expect(screen.getByText(/Kept: the matches, scores and statistics/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'How account deletion works' }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
      'https://www.khelscore.in/legal/deletion',
    );
  });

  it('confirms with the password, leaves the screen and ends the session', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-1');
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await openSheet();
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Passw0rd123');
    await fireEvent.press(submitButton());

    await waitFor(() =>
      expect(api.calls.find((c) => c.url === '/users/me/delete')?.body).toEqual({
        password: 'Passw0rd123',
      }),
    );
    expect(router.dismissTo).toHaveBeenCalledWith('/');
    await waitFor(() => expect(useAuthStore.getState().status).toBe(AUTH_STATUS.ANONYMOUS));
  });

  it('keeps the session and shows the translated refusal when the captain still has a team', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = fakeApi((call) => {
      if (call.url === '/users/me/delete') return fail(409, 'CAPTAIN_TEAM_ACTIVE');
      if (call.url === '/users/me') return ok({ ...PROFILE, role: 'captain' });
      if (call.url === '/otp/config')
        return ok({ available: true, flow: 'code', channel: 'whatsapp' });
      if (call.url === '/media/config') return ok({ enabled: true, maxImageMb: 5, maxVideoMb: 50 });
      return ok(null);
    });
    await renderWithQuery(<Profile />);

    await openSheet();
    expect(screen.getByText(/You are a team captain/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Passw0rd123');
    await fireEvent.press(submitButton());

    await waitFor(() =>
      expect(useNoticeStore.getState().notice).toMatchObject({
        tone: 'error',
        message: 'Hand your team to another captain or deactivate it before deleting your account',
      }),
    );
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.AUTHENTICATED);
  });

  it('never sends an empty confirmation', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await openSheet();
    await fireEvent.press(submitButton());
    expect(api.calls.some((c) => c.url === '/users/me/delete')).toBe(false);
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
