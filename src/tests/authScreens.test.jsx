import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import ForgotPassword from '../app/auth/forgot-password.jsx';
import Login from '../app/auth/login.jsx';
import Register from '../app/auth/register.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
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
      case '/otp/send':
        return ok({ challengeId: 'c1', expiresAt: PAST, resendAvailableAt: PAST }, 201);
      case '/otp/verify':
        return ok({ otpToken: 'proof-1' });
      case '/invitations/lookup':
        return ok({
          invitations: [
            { team: { id: 't1', name: 'Gaon Warriors' }, playerName: 'Asha Devi', jerseyNumber: 7 },
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
      case '/auth/login':
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
  it('signs in with a password, keeps the token in the keystore and returns home', async () => {
    api = authApi();
    await renderWithQuery(<Login />);

    await fireEvent.changeText(screen.getByLabelText('Email or phone number'), '9876543210');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Kabaddi123');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
    expect(api.calls.find((c) => c.url === '/auth/login').body).toEqual({
      identifier: '9876543210',
      password: 'Kabaddi123',
    });
    expect(SecureStore.__store.get(REFRESH_KEY)).toBe('rt-login');
    expect(useAuthStore.getState().status).toBe(AUTH_STATUS.AUTHENTICATED);
  });

  it('shows the translated reason, never the server text, and stays signed out', async () => {
    api = authApi({ '/auth/login': () => fail(401, 'INVALID_CREDENTIALS') });
    await renderWithQuery(withNotices(<Login />));

    await fireEvent.changeText(screen.getByLabelText('Email or phone number'), 'x@example.com');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'wrong');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Incorrect email/phone or password')).toBeTruthy();
    expect(SecureStore.__store.has(REFRESH_KEY)).toBe(false);
  });

  it('signs in with a WhatsApp code when the code flow is available', async () => {
    api = authApi();
    await renderWithQuery(<Login />);

    await fireEvent.press(await screen.findByRole('radio', { name: 'OTP' }));
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '9876543210');
    startPress(screen.getByRole('button', { name: 'Send OTP' }));
    await verifyCodeInSheet();

    await waitFor(() => expect(useAuthStore.getState().status).toBe(AUTH_STATUS.AUTHENTICATED));
    expect(api.calls.find((c) => c.url === '/otp/send').body).toEqual({ phone: '+919876543210' });
    expect(api.calls.find((c) => c.url === '/auth/otp/login').body).toEqual({
      phone: '+919876543210',
      otpToken: 'proof-1',
    });
  });

  it('offers password sign-in only when the API uses a widget flow', async () => {
    api = authApi({ '/otp/config': () => ok({ available: true, flow: 'widget', channel: 'sms' }) });
    await renderWithQuery(<Login />);
    await waitFor(() => expect(api.calls.some((c) => c.url === '/otp/config')).toBe(true));
    expect(screen.queryByRole('radio', { name: 'OTP' })).toBeNull();
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
    await fireEvent.changeText(screen.getByLabelText('Password'), 'Kabaddi123');
    await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Kabaddi123');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText("You're in the Gaon Warriors squad.")).toBeTruthy();
    expect(api.calls.find((c) => c.url === '/auth/register').body).toEqual({
      name: 'Asha Devi',
      email: '',
      phone: '+919876543210',
      password: 'Kabaddi123',
      otpToken: 'proof-1',
    });
    expect(SecureStore.__store.get(REFRESH_KEY)).toBe('rt-register');
    await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/'));
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
});

describe('Forgot password', () => {
  it('resets by phone code and offers the way back to sign in', async () => {
    api = authApi();
    await renderWithQuery(<ForgotPassword />);

    await fireEvent.press(await screen.findByRole('radio', { name: 'Phone' }));
    await fireEvent.changeText(screen.getByLabelText('Phone number'), '9876543210');
    await fireEvent.changeText(screen.getByLabelText('New password'), 'Kabaddi456');
    await fireEvent.changeText(screen.getByLabelText('Confirm password'), 'Kabaddi456');
    startPress(screen.getByRole('button', { name: 'Verify and update password' }));
    await verifyCodeInSheet();

    expect(
      await screen.findByText('Password updated. Sign in with your new password.'),
    ).toBeTruthy();
    expect(api.calls.find((c) => c.url === '/auth/otp/reset-password').body).toEqual({
      phone: '+919876543210',
      otpToken: 'proof-1',
      password: 'Kabaddi456',
    });
  });
});
