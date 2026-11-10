import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import Login from '../app/auth/login.jsx';
import Register from '../app/auth/register.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { useNoticeStore } from '../store/noticeStore.js';
import { REFRESH_KEY, fail, fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20_000);

// Sending is enabled once GET /otp/config has said the code flow is available.
const sendOtpButton = () => screen.findByRole('button', { name: 'Send OTP', disabled: false });

// A press that opens the code sheet settles only once the code has been
// entered, so it is started, not awaited; the sheet is then found on screen.
const startPress = (element) => {
  fireEvent.press(element);
};

const USER = { id: 'u1', name: 'Asha Devi', role: 'user' };
const OTP_CODE_FLOW = { available: true, flow: 'code', channel: 'whatsapp' };
const PAST = new Date(Date.now() - 1000).toISOString();
let api;

beforeEach(() => {
  resetSession();
  useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
  jest.clearAllMocks();
});
afterEach(() => api?.restore());

// The whole API the auth screens talk to, answered in memory.
function authApi(overrides = {}) {
  return fakeApi(({ url }) => {
    if (overrides[url]) return overrides[url]();
    switch (url) {
      case '/otp/config':
        return ok(OTP_CODE_FLOW);
      case '/auth/check-phone':
        return ok({ available: true });
      case '/otp/send':
        return ok({ challengeId: 'c1', expiresAt: PAST, resendAvailableAt: PAST }, 201);
      case '/otp/verify':
        return ok({ otpToken: 'proof-1' });
      case '/invitations/lookup':
        return ok({
          invitations: [
            { team: { id: 't1', name: 'Gaon Warriors' }, playerName: 'Asha Devi', jerseyNumber: '7' },
          ],
        });
      case '/auth/register':
        return ok(
          {
            user: USER,
            accessToken: 'at',
            refreshToken: 'rt-register',
            joinedTeams: [{ id: 't1', name: 'Gaon Warriors' }],
          },
          201,
        );
      case '/auth/otp/login':
        return ok({ user: USER, accessToken: 'at', refreshToken: 'rt-login' });
      default:
        return ok({});
    }
  });
}

const withNotices = (element) => (
  <>
    {element}
    <NoticeHost />
  </>
);

async function verifyCodeInSheet(code = '123456') {
  await fireEvent.changeText(await screen.findByLabelText('Verification code'), code);
  await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
}

describe('Sign in', () => {
  it('signs in with a WhatsApp code and keeps the refresh token in the keystore', async () => {
    api = authApi();
    await renderWithQuery(<Login />);

    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9876543210');
    startPress(await sendOtpButton());
    await verifyCodeInSheet();

    await waitFor(() => expect(useAuthStore.getState().status).toBe(AUTH_STATUS.AUTHENTICATED));
    expect(api.calls.find((c) => c.url === '/otp/send').body).toEqual({ phone: '+919876543210' });
    expect(api.calls.find((c) => c.url === '/auth/otp/login').body).toEqual({
      phone: '+919876543210',
      otpToken: 'proof-1',
    });
    expect(SecureStore.__store.get(REFRESH_KEY)).toBe('rt-login');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
  });

  it('offers no password or email login path on mobile', async () => {
    api = authApi();
    await renderWithQuery(<Login />);
    await screen.findByLabelText('Phone number');
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.queryByLabelText('Email or phone number')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('shows the WhatsApp OTP badge when the server channel is WhatsApp', async () => {
    api = authApi();
    await renderWithQuery(<Login />);
    expect(await screen.findByText('Login with WhatsApp OTP')).toBeTruthy();
  });

  it('says sign-in is unavailable when the server has no OTP provider', async () => {
    api = authApi({ '/otp/config': () => ok({ available: false, flow: null, channel: null }) });
    await renderWithQuery(<Login />);
    expect(
      await screen.findByText("Sign-in isn't available right now. Please try again in a few minutes."),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Phone number')).toBeNull();
  });

  it('sends a visitor with no account to sign-up with the proof carried over', async () => {
    api = authApi({ '/auth/otp/login': () => fail(404, 'PHONE_NOT_REGISTERED') });
    await renderWithQuery(withNotices(<Login />));

    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9876543210');
    startPress(await sendOtpButton());
    await verifyCodeInSheet();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/auth/register',
        params: { phone: '+919876543210', otpToken: 'proof-1' },
      }),
    );
  });
});

describe('Create account', () => {
  it('proves the number, shows the waiting team, prefills the name and lands signed in', async () => {
    api = authApi();
    await renderWithQuery(withNotices(<Register />));

    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9876543210');
    startPress(await sendOtpButton());
    await verifyCodeInSheet();

    expect(await screen.findByText('Joining Gaon Warriors · Jersey #7')).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('Asha Devi');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Account created. Welcome to KhelScore!')).toBeTruthy();
    const call = api.calls.find((c) => c.url === '/auth/register');
    expect(call.body.name).toBe('Asha Devi');
    // An invitation's jersey number is kept when there is one, so the invited
    // player's shirt is still what the account is created with.
    expect(call.body.jerseyNumber).toBe('7');
    expect(call.body.phone).toBe('+919876543210');
    expect(call.body.otpToken).toBe('proof-1');
    // A throwaway password is sent so the API's `password` constraint is
    // satisfied; it is never shown to or chosen by the user.
    expect(typeof call.body.password).toBe('string');
    expect(call.body.password.length).toBeGreaterThanOrEqual(6);
    expect(SecureStore.__store.get(REFRESH_KEY)).toBe('rt-register');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
  });

  it('asks for the name alone — no password, jersey, email or location', async () => {
    api = authApi({ '/invitations/lookup': () => ok({ invitations: [] }) });
    await renderWithQuery(<Register />);

    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9876543210');
    startPress(await sendOtpButton());
    await verifyCodeInSheet();

    await screen.findByLabelText('Name');
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.queryByLabelText('Confirm password')).toBeNull();
    expect(screen.queryByLabelText('Jersey number')).toBeNull();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/state/i)).toBeNull();
    expect(screen.queryByLabelText(/district/i)).toBeNull();
    expect(screen.queryByLabelText('Date of birth')).toBeNull();
    expect(screen.queryByLabelText('Height (cm)')).toBeNull();
    expect(screen.queryByLabelText('Weight (kg)')).toBeNull();
  });

  // A sign-up without any pending invitation still succeeds — the jersey number
  // the API requires falls back to the "0" placeholder.
  it('falls back to a "0" jersey when nothing is pending for the number', async () => {
    api = authApi({ '/invitations/lookup': () => ok({ invitations: [] }) });
    await renderWithQuery(<Register />);

    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9876543210');
    startPress(await sendOtpButton());
    await verifyCodeInSheet();

    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Asha Devi');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(api.calls.find((c) => c.url === '/auth/register')?.body.jerseyNumber).toBe('0'),
    );
  });

  // The welcome panel was removed at the owner's request, so signing up now
  // raises no panel of any kind — only the toast.
  it('raises no welcome panel after signing up', async () => {
    api = authApi({ '/invitations/lookup': () => ok({ invitations: [] }) });
    await renderWithQuery(withNotices(<Register />));

    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9876543210');
    startPress(await sendOtpButton());
    await verifyCodeInSheet();
    await fireEvent.changeText(await screen.findByLabelText('Name'), 'Asha Devi');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(api.calls.some((c) => c.url === '/auth/register')).toBe(true));
    expect(screen.queryByText('Welcome to KhelScore!')).toBeNull();
    expect(useNoticeStore.getState().prompts).toEqual([]);
  });

  it('refuses a number that is not an Indian mobile before sending anything', async () => {
    api = authApi();
    await renderWithQuery(<Register />);
    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '5876543210');
    startPress(await sendOtpButton());
    expect(await screen.findByText('Enter a 10-digit Indian mobile number')).toBeTruthy();
    expect(api.calls.some((c) => c.url === '/otp/send')).toBe(false);
  });

  it('keeps a wrong code in the sheet with the translated reason', async () => {
    api = authApi({ '/otp/verify': () => fail(400, 'OTP_CODE_INVALID') });
    await renderWithQuery(<Register />);
    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9876543210');
    startPress(await sendOtpButton());
    await verifyCodeInSheet('000000');
    expect(await screen.findByText("That code isn't right. Check it and try again.")).toBeTruthy();
    expect(api.calls.some((c) => c.url === '/auth/register')).toBe(false);
  });

  it('shows the sign-in branch when the number already has an account, without sending an OTP', async () => {
    api = authApi({
      '/auth/check-phone': () => ok({ available: false, reason: 'inUse' }),
    });
    await renderWithQuery(withNotices(<Register />));

    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9876543210');
    startPress(await sendOtpButton());

    expect(
      await screen.findByText('This number already has an account — sign in instead.'),
    ).toBeTruthy();
    // The OTP was not spent, and registration was never attempted.
    expect(api.calls.some((c) => c.url === '/otp/send')).toBe(false);
    expect(api.calls.some((c) => c.url === '/auth/register')).toBe(false);

    // The Sign-in button takes them to /auth/login with the number pre-filled.
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/auth/login',
        params: { phone: '+919876543210' },
      }),
    );
  });
});
