import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Login from '../app/auth/login.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { useAccountPrompts } from '../hooks/useAccountPrompts.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { useNoticeStore } from '../store/noticeStore.js';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20_000);

// What the account still owes is read from `profileState` on the sign-in answer
// (API modules/users/profileState.js) — never from a flag the app remembered.
// The reminder is raised by the hook the root layout runs and drawn by the
// notice host, so the harness is exactly that pair.
function Prompts() {
  useAccountPrompts();
  return <NoticeHost />;
}

const account = (profileState) => ({
  id: 'u1',
  name: 'Asha Devi',
  role: 'user',
  phone: '+919876543210',
  profileState,
});

const COMPLETE = { profileComplete: true, missingFields: [], mustChangePassword: false };
const INCOMPLETE = {
  profileComplete: false,
  missingFields: ['jerseyNumber'],
  mustChangePassword: false,
};
const TEMPORARY = { profileComplete: true, missingFields: [], mustChangePassword: true };
const BOTH = {
  profileComplete: false,
  missingFields: ['jerseyNumber'],
  mustChangePassword: true,
};

let api;

beforeEach(() => {
  resetSession();
  useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
  jest.clearAllMocks();
});
afterEach(() => api?.restore());

function loginApi(profileState) {
  return fakeApi(({ url }) => {
    if (url === '/otp/config') return ok({ available: true, flow: 'code', channel: 'whatsapp' });
    if (url === '/auth/login') {
      return ok({ user: account(profileState), accessToken: 'at', refreshToken: 'rt' });
    }
    return ok({});
  });
}

async function signIn(profileState) {
  api = loginApi(profileState);
  await renderWithQuery(
    <>
      <Login />
      <Prompts />
    </>,
  );
  await fireEvent.changeText(screen.getByLabelText('Email or phone number'), '9876543210');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'Kabaddi123');
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
}

describe('Reminders after signing in', () => {
  it('says nothing when the account owes nothing', async () => {
    await signIn(COMPLETE);
    await waitFor(() => expect(useAuthStore.getState().status).toBe(AUTH_STATUS.AUTHENTICATED));
    expect(screen.queryByText('Finish setting up your account')).toBeNull();
  });

  it('reminds an incomplete profile, naming what is missing', async () => {
    await signIn(INCOMPLETE);

    expect(await screen.findByText('Finish setting up your account')).toBeTruthy();
    expect(screen.getByText('Complete your profile')).toBeTruthy();
    expect(screen.getByText('Still needed: jersey number')).toBeTruthy();
    expect(screen.queryByText('Set your own password')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Open my profile' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/dashboard/profile',
      params: undefined,
    });
  });

  it('reminds a temporary password and links to the password form', async () => {
    await signIn(TEMPORARY);

    expect(await screen.findByText('Set your own password')).toBeTruthy();
    expect(screen.queryByText('Complete your profile')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Change password' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/dashboard/profile',
      params: { changePassword: '1' },
    });
  });

  it('shows both reasons together when both apply', async () => {
    await signIn(BOTH);

    expect(await screen.findByText('Complete your profile')).toBeTruthy();
    expect(screen.getByText('Set your own password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open my profile' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change password' })).toBeTruthy();
  });

  it('stays dismissed for the rest of the sign-in session', async () => {
    await signIn(INCOMPLETE);
    expect(await screen.findByText('Finish setting up your account')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Later' }));
    await waitFor(() => expect(screen.queryByText('Finish setting up your account')).toBeNull());

    // A token refresh replaces the account object with an equal one; the
    // reminder must not come back.
    await waitFor(() =>
      useAuthStore.getState().setSession({ user: account(INCOMPLETE), accessToken: 'at2' }),
    );
    expect(screen.queryByText('Finish setting up your account')).toBeNull();
    expect(useNoticeStore.getState().prompts).toEqual([]);
  });

  it('closes itself as soon as the account satisfies it', async () => {
    await signIn(INCOMPLETE);
    expect(await screen.findByText('Finish setting up your account')).toBeTruthy();

    // Finishing the profile elsewhere in the app answers with a fresh
    // profileState, which is all it takes.
    await waitFor(() => useAuthStore.getState().setUser(account(COMPLETE)));
    await waitFor(() => expect(screen.queryByText('Finish setting up your account')).toBeNull());
  });

  it('is checked again at the next sign-in', async () => {
    await signIn(INCOMPLETE);
    expect(await screen.findByText('Finish setting up your account')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Later' }));
    await waitFor(() => expect(screen.queryByText('Finish setting up your account')).toBeNull());

    // Signing out ends the session the dismissal belonged to.
    await waitFor(() => useAuthStore.getState().clear());
    await waitFor(() => expect(useNoticeStore.getState().raised).toEqual({}));

    await waitFor(() =>
      useAuthStore.getState().setSession({ user: account(INCOMPLETE), accessToken: 'at3' }),
    );
    expect(await screen.findByText('Finish setting up your account')).toBeTruthy();
  });
});
