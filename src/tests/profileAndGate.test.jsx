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
  // The player half of the account, and what it still owes — both from the
  // server (API users.serializer.serializeAccount, modules/users/profileState).
  profile: {
    playerId: 'p1',
    jerseyNumber: '7',
    heightCm: 175,
    weightKg: 70,
    dob: '1999-04-21',
    age: 27,
    photoUrl: null,
  },
  profileState: { profileComplete: true, missingFields: [] },
};
let api;

beforeEach(() => {
  resetSession();
  jest.clearAllMocks();
});
afterEach(() => api?.restore());

function profileApi(account = PROFILE) {
  return fakeApi(({ method, url, body }) => {
    if (method === 'patch' && url === '/users/me') return ok({ ...account, ...body });
    if (url === '/users/me') return ok(account);
    if (url === '/otp/config') return ok({ available: true, flow: 'code', channel: 'whatsapp' });
    if (url === '/media/config') return ok({ enabled: true, maxImageMb: 5, maxVideoMb: 50 });
    if (method === 'patch' && url === '/users/me/notification-preferences') {
      return ok({
        ...account,
        notificationPreferences: { ...account.notificationPreferences, ...body },
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

  // The jersey number is required data, the measurements are not, and the age
  // is the server's — never recomputed here.
  it('shows the jersey number, the measurements and the age the server derived', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    expect(await screen.findByLabelText('Jersey number')).toBeTruthy();
    expect(screen.getByLabelText('Jersey number').props.value).toBe('7');
    expect(screen.getByLabelText('Height (cm)').props.value).toBe('175');
    expect(screen.getByLabelText('Weight (kg)').props.value).toBe('70');
    expect(screen.getByText('Age 27')).toBeTruthy();
    expect(screen.getByText('Profile complete')).toBeTruthy();
  });

  it('names what the profile is still missing, from profileState alone', async () => {
    const owing = {
      ...PROFILE,
      profile: { ...PROFILE.profile, jerseyNumber: null, dob: null, age: null },
      profileState: { profileComplete: false, missingFields: ['jerseyNumber'] },
    };
    useAuthStore.getState().setSession({ user: owing, accessToken: 'at' });
    api = profileApi(owing);
    await renderWithQuery(<Profile />);

    expect(await screen.findByText('Profile incomplete')).toBeTruthy();
    expect(screen.getByText('Still needed: jersey number')).toBeTruthy();
  });

  it('saves the jersey number, height, weight and birthday in one request', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await fireEvent.changeText(await screen.findByLabelText('Jersey number'), '11');
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '72');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      const call = api.calls.find((c) => c.method === 'patch' && c.url === '/users/me');
      expect(call?.body).toMatchObject({
        name: 'Asha Devi',
        jerseyNumber: '11',
        heightCm: 175,
        weightKg: 72,
        dob: '1999-04-21',
      });
      // The number is only ever changed through its own OTP flow.
      expect(call.body.phone).toBeUndefined();
    });
  });

  // An organiser (Admin, Manager, Super Admin) has no player profile, so the
  // sports fields are not theirs to fill in.
  it('shows no jersey number or measurements to a manager', async () => {
    const manager = {
      ...PROFILE,
      role: 'manager',
      email: 'manager@khelscore.in',
      profile: { playerId: null, jerseyNumber: null, heightCm: null, weightKg: null, dob: null, age: null, photoUrl: null },
      profileState: { profileComplete: true, missingFields: [], mustChangePassword: false },
    };
    useAuthStore.getState().setSession({ user: manager, accessToken: 'at' });
    api = profileApi(manager);
    await renderWithQuery(<Profile />);

    expect(await screen.findByText('Signed in as Manager')).toBeTruthy();
    expect(screen.queryByLabelText('Jersey number')).toBeNull();
    expect(screen.queryByLabelText('Height (cm)')).toBeNull();
    expect(screen.queryByLabelText('Weight (kg)')).toBeNull();
  });

  // Mobile is OTP-only: the password change screen and reminder have been
  // retired, so the profile offers no password controls at all.
  it('shows no password controls on mobile', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await screen.findByText('Signed in as User');
    expect(screen.queryByRole('button', { name: 'Change password' })).toBeNull();
    expect(screen.queryByLabelText('Current password')).toBeNull();
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

  // The button sits under Delete account and wears the same danger colour, so
  // it asks first. Once the sheet is open there are two "Log out" buttons —
  // the screen's and the sheet's — and the last one is the sheet's.
  const confirmLogout = async () => {
    await fireEvent.press(await screen.findByRole('button', { name: 'Log out' }));
    expect(await screen.findByText(/Log out of KhelScore\?/)).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Log out' }).at(-1));
  };

  it('asks before signing out, and stays signed in when the question is dismissed', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-1');
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Log out' }));
    expect(await screen.findByText(/Log out of KhelScore\?/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(router.dismissTo).not.toHaveBeenCalled();
    expect(api.calls.find((c) => c.url === '/auth/logout')).toBeUndefined();
    expect(SecureStore.__store.has(REFRESH_KEY)).toBe(true);
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.AUTHENTICATED);
  });

  it('signs out: home first, then the session is revoked and wiped from the device', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-1');
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await confirmLogout();
    expect(router.dismissTo).toHaveBeenCalledWith('/');
    await waitFor(() => expect(SecureStore.__store.has(REFRESH_KEY)).toBe(false));
    expect(api.calls.find((c) => c.url === '/auth/logout').body).toEqual({ refreshToken: 'rt-1' });
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.ANONYMOUS);
  });
});

// Deleting the account from the app (M4). Google Play requires the app itself
// to offer it, so the whole flow is here. Mobile confirms deletion with an OTP
// to the number on the account — the password confirmation path is gone.
describe('Delete account', () => {
  const openSheet = async () => {
    const buttons = await screen.findAllByRole('button', { name: 'Delete my account' });
    await fireEvent.press(buttons[0]);
  };

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

  it('shows the OTP confirmation path and offers no password field', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await openSheet();
    expect(screen.queryByLabelText('Password')).toBeNull();
    // The confirm button is the OTP path; its label comes from
    // profile.deleteWithOtp.
    expect(screen.getAllByRole('button', { name: /Verify .* and delete/i }).length).toBeGreaterThan(
      0,
    );
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
