// The notifications screen and the notice shown when one arrives while the app
// is open. Text is rendered from `type` + `params`, so it follows the reader's
// language rather than the language it was sent in.
const mockSocket = {
  handlers: new Map(),
  on: jest.fn((event, fn) => mockSocket.handlers.set(event, fn)),
  close: jest.fn(),
  fire: (event, payload) => mockSocket.handlers.get(event)?.(payload),
};
jest.mock('../lib/socket.js', () => ({
  createUserSocket: jest.fn(() => mockSocket),
  getMatchSocket: jest.fn(),
  onResume: jest.fn(() => () => {}),
  BACKGROUND_DISCONNECT_MS: 30_000,
}));

import { act, configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Notifications from '../app/dashboard/notifications.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { useNotificationSocket } from '../hooks/useNotificationSocket.js';
import i18n from '../i18n/index.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20_000);

const notification = (n, extra = {}) => ({
  id: `n${n}`,
  type: 'match_started',
  params: { teamA: 'Shiva Raiders', teamB: 'Gaon Warriors' },
  link: '/match/m1',
  read: false,
  createdAt: '2026-09-27T09:00:00.000Z',
  ...extra,
});

let api;

function listOf(items, unread = items.filter((i) => !i.read).length) {
  return ok({
    items,
    unread,
    pagination: { page: 1, limit: 20, total: items.length, totalPages: 1 },
  });
}

beforeEach(async () => {
  resetSession();
  jest.clearAllMocks();
  mockSocket.handlers.clear();
  useAuthStore.setState({
    status: AUTH_STATUS.AUTHENTICATED,
    user: { id: 'u1' },
    accessToken: 'at',
  });
  await act(() => i18n.changeLanguage('en'));
});
afterEach(() => api?.restore());

describe('the notifications screen', () => {
  it('lists what happened, in the reader’s language, with the unread ones marked', async () => {
    api = fakeApi(() => listOf([notification(1), notification(2, { read: true })]));
    await renderWithQuery(<Notifications />);

    expect(await screen.findAllByText('Live now: Shiva Raiders vs Gaon Warriors')).toHaveLength(2);
    expect(screen.getAllByLabelText('Unread')).toHaveLength(1);
  });

  it('marks one read and opens what it is about', async () => {
    api = fakeApi(({ method }) => (method === 'patch' ? ok({}) : listOf([notification(1)])));
    await renderWithQuery(<Notifications />);

    await fireEvent.press(await screen.findByText('Live now: Shiva Raiders vs Gaon Warriors'));
    await waitFor(() =>
      expect(api.calls.some((c) => c.url === '/notifications/n1/read')).toBe(true),
    );
    expect(router.push).toHaveBeenCalledWith('/match/m1');
  });

  it('does not mark an already read one again', async () => {
    api = fakeApi(({ method }) =>
      method === 'patch' ? ok({}) : listOf([notification(1, { read: true })]),
    );
    await renderWithQuery(<Notifications />);

    await fireEvent.press(await screen.findByText('Live now: Shiva Raiders vs Gaon Warriors'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/match/m1'));
    expect(api.calls.some((c) => c.method === 'patch')).toBe(false);
  });

  it('marks everything read, and offers it only while something is unread', async () => {
    api = fakeApi(({ method, url }) =>
      method === 'patch' && url === '/notifications/read-all' ? ok({}) : listOf([notification(1)]),
    );
    await renderWithQuery(<Notifications />);

    const markAll = await screen.findByRole('button', { name: 'Mark all as read' });
    await fireEvent.press(markAll);
    await waitFor(() =>
      expect(api.calls.some((c) => c.url === '/notifications/read-all')).toBe(true),
    );
  });

  it('cannot mark everything read when nothing is unread', async () => {
    api = fakeApi(() => listOf([notification(1, { read: true })], 0));
    await renderWithQuery(<Notifications />);
    const markAll = await screen.findByRole('button', { name: 'Mark all as read' });
    expect(markAll.props.accessibilityState.disabled).toBe(true);
  });

  it('filters down to the unread ones', async () => {
    api = fakeApi(({ params }) =>
      listOf(
        params?.unreadOnly === 'true'
          ? [notification(1)]
          : [notification(1), notification(2, { read: true })],
      ),
    );
    await renderWithQuery(<Notifications />);
    await screen.findAllByText('Live now: Shiva Raiders vs Gaon Warriors');

    await fireEvent.press(screen.getByRole('tab', { name: 'Unread' }));
    await waitFor(() =>
      expect(screen.getAllByText('Live now: Shiva Raiders vs Gaon Warriors')).toHaveLength(1),
    );
  });

  it('says when there is nothing to read', async () => {
    api = fakeApi(() => listOf([], 0));
    await renderWithQuery(<Notifications />);
    expect(await screen.findByText("You're all caught up")).toBeTruthy();
  });

  it('sends a signed-out visitor to sign in, and asks the API nothing', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
    api = fakeApi(() => listOf([]));
    await renderWithQuery(<Notifications />);
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
    expect(api.calls).toHaveLength(0);
  });
});

describe('while the app is open', () => {
  it('shows a notice in the reader’s language and refreshes the list', async () => {
    api = fakeApi(() => listOf([]));
    await renderWithQuery(
      <>
        <NoticeHost />
        <SocketHost />
      </>,
    );

    await act(async () =>
      mockSocket.fire('notification:new', {
        id: 'n9',
        type: 'match_result',
        params: { teamA: 'Shiva Raiders', scoreA: 31, scoreB: 28, teamB: 'Gaon Warriors' },
      }),
    );
    expect(await screen.findByText('Full time: Shiva Raiders 31 – 28 Gaon Warriors')).toBeTruthy();
  });

  it('opens no socket while nobody is signed in', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS, accessToken: null });
    api = fakeApi(() => listOf([]));
    await renderWithQuery(<SocketHost />);
    expect(mockSocket.on).not.toHaveBeenCalled();
  });
});

function SocketHost() {
  useNotificationSocket();
  return null;
}
