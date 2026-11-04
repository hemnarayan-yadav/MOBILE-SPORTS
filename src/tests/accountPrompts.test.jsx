import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { useAccountPrompts } from '../hooks/useAccountPrompts.js';
// Importing i18n initialises react-i18next with the app's resource bundles,
// so the panel's `t(...)` calls resolve against en.json rather than returning
// the raw key.
import '../i18n/index.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { useNoticeStore } from '../store/noticeStore.js';
import { renderWithQuery, resetSession } from './helpers.jsx';

// What the account still owes is read from `profileState` on the sign-in answer
// (API modules/users/profileState.js) — never from a flag the app remembered.
// Mobile is OTP-only, so the password reminder is gone; only the incomplete
// profile reminder is surfaced. The hook the root layout runs is what raises
// the panel, so the harness is exactly that pair driven by the auth store.
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

const COMPLETE = { profileComplete: true, missingFields: [] };
const INCOMPLETE = { profileComplete: false, missingFields: ['jerseyNumber'] };

beforeEach(() => {
  resetSession();
  useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
  jest.clearAllMocks();
});

async function signIn(profileState) {
  await renderWithQuery(<Prompts />);
  await waitFor(() =>
    useAuthStore.getState().setSession({ user: account(profileState), accessToken: 'at' }),
  );
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

    await fireEvent.press(screen.getByRole('button', { name: 'Open my profile' }));
    expect(router.push).toHaveBeenCalledWith('/dashboard/profile');
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
