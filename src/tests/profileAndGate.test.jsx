jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '0.1.0', android: { package: 'in.khelscore.app.dev' } } },
}));

import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
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
  mustChangePassword: false,
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
  profileState: { profileComplete: true, missingFields: [], mustChangePassword: false },
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
      profileState: {
        profileComplete: false,
        missingFields: ['jerseyNumber'],
        mustChangePassword: true,
      },
      mustChangePassword: true,
    };
    useAuthStore.getState().setSession({ user: owing, accessToken: 'at' });
    api = profileApi(owing);
    await renderWithQuery(<Profile />);

    expect(await screen.findByText('Profile incomplete')).toBeTruthy();
    expect(screen.getByText('Still needed: jersey number')).toBeTruthy();
    expect(screen.getAllByText(/still uses the temporary password/).length).toBeGreaterThan(
      0,
    );
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

  // Changing the password signs the account out everywhere, so the app says so,
  // forgets the session on this device and sends the person to sign in again.
  it('changes the password, then ends the session and asks for a fresh sign-in', async () => {
    SecureStore.__store.set(REFRESH_KEY, 'rt-1');
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Change password' }));
    expect(
      await screen.findByText(/Changing your password signs you out on every device/),
    ).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Current password'), 'old12345');
    await fireEvent.changeText(screen.getByLabelText('New password'), 'Kabaddi456');
    await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Kabaddi456');
    await fireEvent.press(screen.getAllByRole('button', { name: 'Change password' }).at(-1));

    await waitFor(() =>
      expect(api.calls.find((c) => c.url === '/users/me/password')?.body).toEqual({
        currentPassword: 'old12345',
        password: 'Kabaddi456',
      }),
    );
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
    await waitFor(() => expect(SecureStore.__store.has(REFRESH_KEY)).toBe(false));
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.ANONYMOUS);
  });

  it('never sends a password change whose confirmation does not match', async () => {
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Change password' }));
    await fireEvent.changeText(screen.getByLabelText('Current password'), 'old12345');
    await fireEvent.changeText(screen.getByLabelText('New password'), 'Kabaddi456');
    await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Kabaddi999');
    await fireEvent.press(screen.getAllByRole('button', { name: 'Change password' }).at(-1));

    expect(await screen.findByText("Passwords don't match")).toBeTruthy();
    expect(api.calls.some((c) => c.url === '/users/me/password')).toBe(false);
  });

  // The temporary-password reminder links straight here.
  it('opens the password form straight away when the reminder sent them', async () => {
    useLocalSearchParams.mockReturnValue({ changePassword: '1' });
    useAuthStore.getState().setSession({ user: PROFILE, accessToken: 'at' });
    api = profileApi();
    await renderWithQuery(<Profile />);

    expect(await screen.findByLabelText('Current password')).toBeTruthy();
    useLocalSearchParams.mockReturnValue({});
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
