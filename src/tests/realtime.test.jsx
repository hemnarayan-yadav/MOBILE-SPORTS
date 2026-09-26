// The live match socket: joining and resynchronising a match room, ignoring
// stale updates, closing 30 s after the app goes to the background, and on
// return either reconnecting or asking for a fresh snapshot.
jest.mock('socket.io-client', () => {
  const handlers = new Map();
  const socket = {
    connected: true,
    on: jest.fn((event, fn) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
    }),
    off: jest.fn((event, fn) => handlers.get(event)?.delete(fn)),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    fire: (event, ...args) => handlers.get(event)?.forEach((fn) => fn(...args)),
  };
  return { io: jest.fn(() => socket), __socket: socket };
});

import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { __socket as socket } from 'socket.io-client';
import { qk } from '../api/queryKeys.js';
import { isNewerMatch, useMatchSocket } from '../hooks/useMatchSocket.js';
import { createQueryClient } from '../lib/queryClient.js';
import { resetServerClock, serverOffsetMs } from '../lib/serverClock.js';
import { BACKGROUND_DISCONNECT_MS } from '../lib/socket.js';
import live from './fixtures/match-live.json';

let appStateListener;
jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
  appStateListener = listener;
  return { remove: jest.fn() };
});

const KEY = qk.matches.detail(live.id);
const withVersion = (version, extra = {}) => ({
  ...live,
  ...extra,
  live: { ...live.live, version, serverTime: new Date(Date.now() - 25_000).toISOString() },
});

// Join and sync answer with the given snapshot.
function answerWith(match) {
  socket.emit.mockImplementation((event, _id, ack) => {
    if (event === 'match:join' || event === 'match:sync') ack?.({ ok: true, match });
  });
}

async function mountHook() {
  const client = createQueryClient();
  // No garbage-collection timer is left behind for Jest to wait on.
  client.setDefaultOptions({ queries: { gcTime: Infinity } });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = await renderHook(() => useMatchSocket(live.id), { wrapper });
  return { client, hook };
}

beforeEach(() => {
  jest.clearAllMocks();
  socket.connected = true;
  resetServerClock();
});

describe('match room', () => {
  it('joins on mount, fills the match from the snapshot and measures the clocks', async () => {
    answerWith(withVersion(5));
    const { client, hook } = await mountHook();
    expect(socket.emit).toHaveBeenCalledWith('match:join', live.id, expect.any(Function));
    expect(client.getQueryData(KEY).live.version).toBe(5);
    expect(hook.result.current.connected).toBe(true);
    // The snapshot's server time was 25 s behind this device.
    expect(Math.round(serverOffsetMs() / 1000)).toBe(-25);
  });

  it('applies newer updates and ignores stale ones', async () => {
    answerWith(withVersion(5));
    const { client } = await mountHook();
    await act(() => socket.fire('match:update', { match: withVersion(7) }));
    expect(client.getQueryData(KEY).live.version).toBe(7);
    await act(() => socket.fire('match:update', { match: withVersion(6) }));
    expect(client.getQueryData(KEY).live.version).toBe(7);
    // A status change always wins (live → completed).
    await act(() =>
      socket.fire('match:update', { match: withVersion(2, { status: 'completed' }) }),
    );
    expect(client.getQueryData(KEY).status).toBe('completed');
  });

  it('leaves the room when the screen closes', async () => {
    answerWith(withVersion(5));
    const { hook } = await mountHook();
    await hook.unmount();
    expect(socket.emit).toHaveBeenCalledWith('match:leave', live.id);
  });

  it('decides freshness by version and status', () => {
    expect(isNewerMatch(withVersion(3), undefined)).toBe(true);
    expect(isNewerMatch(withVersion(3), withVersion(4))).toBe(false);
    expect(isNewerMatch(withVersion(4), withVersion(4))).toBe(true);
  });
});

// The screen is mounted with real timers (rendering waits on them); the clock
// is faked only for the background timer that follows.
describe('background and foreground', () => {
  afterEach(() => jest.useRealTimers());

  it('closes the socket 30 s after the app goes to the background', async () => {
    answerWith(withVersion(5));
    await mountHook();
    jest.useFakeTimers();
    appStateListener('background');
    jest.advanceTimersByTime(BACKGROUND_DISCONNECT_MS - 1);
    expect(socket.disconnect).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps the socket when the app returns in time, and resynchronises', async () => {
    answerWith(withVersion(5));
    const { client } = await mountHook();
    jest.useFakeTimers();
    appStateListener('background');
    jest.advanceTimersByTime(10_000);
    answerWith(withVersion(9));
    appStateListener('active');
    jest.advanceTimersByTime(BACKGROUND_DISCONNECT_MS);
    jest.useRealTimers();
    await act(async () => {});
    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('match:sync', live.id, expect.any(Function));
    expect(client.getQueryData(KEY).live.version).toBe(9);
  });

  it('reconnects a socket closed in the background, and rejoins on connect', async () => {
    answerWith(withVersion(5));
    const { client } = await mountHook();
    jest.useFakeTimers();
    appStateListener('background');
    jest.advanceTimersByTime(BACKGROUND_DISCONNECT_MS);
    jest.useRealTimers();
    socket.connected = false;
    await act(() => socket.fire('disconnect'));

    await act(() => appStateListener('active'));
    expect(socket.connect).toHaveBeenCalledTimes(1);

    answerWith(withVersion(12));
    socket.connected = true;
    await act(() => socket.fire('connect'));
    expect(client.getQueryData(KEY).live.version).toBe(12);
  });
});
