import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import JoinDirect from '../app/join/index.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 10_000 });
jest.setTimeout(40_000);

// A captain's request to join their squad, answered by the player it was
// addressed to. Nobody is in a squad until they accept, so /join — where the
// WhatsApp message lands — is where the answer is given.
const USER = { id: 'u1', name: 'Ravi Kumar', role: 'user', phone: '+919812345610', teamId: null };
const REQUEST = {
  id: 'r1',
  status: 'pending',
  jerseyNumber: '9',
  playingRole: 'raider',
  team: { id: 't1', name: 'Biroda King', shortName: 'BK', logoUrl: null, status: 'active' },
  invitedBy: 'Aman Kumar',
  expiresAt: '2026-11-03T00:00:00.000Z',
  createdAt: '2026-10-27T00:00:00.000Z',
};

let api;

beforeEach(() => {
  resetSession();
  jest.clearAllMocks();
  useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, accessToken: 'token', user: USER });
});
afterEach(() => api?.restore());

const withNotices = (element) => (
  <>
    {element}
    <NoticeHost />
  </>
);

function requestsApi(overrides = {}) {
  return fakeApi((call) => {
    const key = `${call.method} ${call.url}`;
    if (overrides[key]) return overrides[key](call);
    if (overrides[call.url]) return overrides[call.url](call);
    switch (call.url) {
      case '/join-requests/mine':
        return ok({ items: [REQUEST] });
      case '/otp/config':
        return ok({ available: true, flow: 'code', channel: 'whatsapp' });
      default:
        return ok({});
    }
  });
}

const sent = (method, url) => api.calls.some((c) => c.method === method && c.url === url);

describe('answering a captain’s request', () => {
  it('names the team, the captain and the place on offer', async () => {
    api = requestsApi();
    await renderWithQuery(<JoinDirect />);

    expect(await screen.findByText('Biroda King')).toBeTruthy();
    expect(screen.getByText('Asked by Aman Kumar')).toBeTruthy();
    expect(screen.getByText('Jersey 9')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeTruthy();
  });

  it('joins the squad on accepting and opens the team', async () => {
    api = requestsApi({
      'post /join-requests/r1/accept': () => ok({ team: { id: 't1', name: 'Biroda King' } }),
    });
    await renderWithQuery(withNotices(<JoinDirect />));

    await fireEvent.press(await screen.findByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(sent('post', '/join-requests/r1/accept')).toBe(true));
    expect(await screen.findByText('You are in Biroda King')).toBeTruthy();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/team/t1'));
  });

  it('stays out of the squad on rejecting', async () => {
    api = requestsApi({ 'post /join-requests/r1/reject': () => ok(null) });
    await renderWithQuery(withNotices(<JoinDirect />));

    await fireEvent.press(await screen.findByRole('button', { name: 'Reject' }));

    await waitFor(() => expect(sent('post', '/join-requests/r1/reject')).toBe(true));
    expect(await screen.findByText('Request rejected')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shows nothing of its own while nothing is waiting', async () => {
    api = requestsApi({ '/join-requests/mine': () => ok({ items: [] }) });
    await renderWithQuery(<JoinDirect />);

    await waitFor(() => expect(sent('get', '/join-requests/mine')).toBe(true));
    expect(screen.queryByText('A squad wants you')).toBeNull();
  });
});
