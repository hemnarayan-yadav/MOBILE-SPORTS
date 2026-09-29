import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import JoinWithToken from '../app/join/[token].jsx';
import JoinDirect from '../app/join/index.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { fail, fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

// The code sheet opens only after GET /otp/config and POST /otp/send have both
// answered, which is slow enough on a loaded machine to need a wider window.
configure({ asyncUtilTimeout: 10_000 });
jest.setTimeout(40_000);

// The invited player's side (M5). /join is the App Link the WhatsApp message
// leads to; /join/<token> previews one invitation. Neither grants anything: an
// invitation is only ever accepted by an OTP proof of the invited number.
const INVITED_PHONE = '+919812345610';
const USER = { id: 'u1', name: 'Ravi Kumar', role: 'user', phone: INVITED_PHONE, teamId: null };
const PAST = new Date(Date.now() - 1000).toISOString();

const preview = (fields = {}) => ({
  status: 'pending',
  phone: INVITED_PHONE,
  playerName: 'Ravi Kumar',
  invitedBy: 'Hemnarayan',
  expiresAt: '2026-10-05T10:00:00.000Z',
  forCurrentUser: true,
  team: { id: 't1', name: 'Biroda King' },
  ...fields,
});

let api;

beforeEach(() => {
  resetSession();
  jest.clearAllMocks();
  useLocalSearchParams.mockReturnValue({ token: 'tok-1' });
});
afterEach(() => api?.restore());

const withNotices = (element) => (
  <>
    {element}
    <NoticeHost />
  </>
);

function joinApi(overrides = {}) {
  return fakeApi((call) => {
    if (overrides[call.url]) return overrides[call.url](call);
    switch (call.url) {
      case '/otp/config':
        return ok({ available: true, flow: 'code', channel: 'whatsapp' });
      case '/otp/send':
        return ok({ challengeId: 'c1', expiresAt: PAST, resendAvailableAt: PAST }, 201);
      case '/otp/verify':
        return ok({ otpToken: 'proof-1' });
      case '/invitations/preview':
        return ok(preview());
      case '/invitations/accept':
        return ok({ accepted: [{ team: { id: 't1', name: 'Biroda King' } }] });
      default:
        return ok({});
    }
  });
}

// Joining is enabled only once GET /otp/config has said a code can be sent, so
// the button is waited for in that state — pressing it disabled does nothing.
const joinButton = () =>
  screen.findByRole('button', { name: 'Confirm number and join', disabled: false });

async function verifyCodeInSheet(code = '123456') {
  await fireEvent.changeText(await screen.findByLabelText('Verification code'), code);
  await fireEvent.press(screen.getByRole('button', { name: 'Verify' }));
}

describe('/join (the link in the WhatsApp message)', () => {
  it('asks a signed-out visitor to sign up or sign in', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
    api = joinApi();
    await renderWithQuery(<JoinDirect />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Create account' }));
    expect(router.push).toHaveBeenCalledWith('/auth/register');
    await fireEvent.press(screen.getByRole('button', { name: 'I already have an account' }));
    expect(router.push).toHaveBeenCalledWith('/auth/login');
    expect(api.calls.some((c) => c.url === '/invitations/accept')).toBe(false);
  });

  it('accepts every waiting invitation after a code, and opens the team', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: USER, accessToken: 'at' });
    api = joinApi();
    await renderWithQuery(withNotices(<JoinDirect />));

    fireEvent.press(await joinButton());
    await verifyCodeInSheet();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/team/t1'));
    // The proof is what accepts, never the link.
    expect(api.calls.find((c) => c.url === '/invitations/accept').body).toEqual({
      otpToken: 'proof-1',
    });
  });

  it('says so when the number had nothing waiting', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: USER, accessToken: 'at' });
    api = joinApi({ '/invitations/accept': () => ok({ accepted: [] }) });
    await renderWithQuery(withNotices(<JoinDirect />));

    fireEvent.press(await joinButton());
    await verifyCodeInSheet();

    expect(await screen.findByText('No open invitation was found for your number.')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('sends an account with no number to the profile instead', async () => {
    useAuthStore.setState({
      status: AUTH_STATUS.AUTHENTICATED,
      user: { ...USER, phone: null },
      accessToken: 'at',
    });
    api = joinApi();
    await renderWithQuery(<JoinDirect />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Open my profile' }));
    expect(router.push).toHaveBeenCalledWith('/dashboard/profile');
  });
});

describe('/join/<token> (an invitation link)', () => {
  it('shows the team, who invited and when the link runs out', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
    api = joinApi();
    await renderWithQuery(<JoinWithToken />);

    expect(await screen.findByText('Join Biroda King')).toBeTruthy();
    expect(screen.getByText(`Sent to: ${INVITED_PHONE}`)).toBeTruthy();
    // The token travels in the body, never in the URL.
    const call = api.calls.find((c) => c.url === '/invitations/preview');
    expect(call.body).toEqual({ token: 'tok-1' });
  });

  it('offers to switch account when the link names a different number', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: USER, accessToken: 'at' });
    api = joinApi({ '/invitations/preview': () => ok(preview({ forCurrentUser: false })) });
    await renderWithQuery(<JoinWithToken />);

    expect(
      await screen.findByText(
        'This invitation was sent to a different number from the one on your account.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirm number and join' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Use another account' })).toBeTruthy();
  });

  it('says when an invitation has expired, and offers nothing to accept', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: USER, accessToken: 'at' });
    api = joinApi({ '/invitations/preview': () => ok(preview({ status: 'expired' })) });
    await renderWithQuery(<JoinWithToken />);

    expect(await screen.findByText(/has expired/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Confirm number and join' })).toBeNull();
  });

  it('treats an unknown link as invalid, and does not offer a retry', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
    api = joinApi({ '/invitations/preview': () => fail(404, 'NOT_FOUND') });
    await renderWithQuery(<JoinWithToken />);

    expect(await screen.findByText(/invitation link is not valid/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('shows an accepted invitation as done and leads to the team', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: USER, accessToken: 'at' });
    api = joinApi({ '/invitations/preview': () => ok(preview({ status: 'accepted' })) });
    await renderWithQuery(<JoinWithToken />);

    await fireEvent.press(await screen.findByRole('button', { name: 'View team' }));
    expect(router.push).toHaveBeenCalledWith('/team/t1');
  });
});
