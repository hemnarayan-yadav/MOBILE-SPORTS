// Small pure modules: API error normalization, query retries, the clock
// helpers, theme resolution and the app lifecycle wiring.
const appState = { listener: null };
const network = { listener: null };

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn((listener) => {
    network.listener = listener;
    return { remove: jest.fn() };
  }),
}));

import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { normalizeError } from '../api/client.js';
import { isForeground, isOnline, startAppLifecycle } from '../lib/appLifecycle.js';
import { shouldRetryQuery } from '../lib/queryClient.js';
import { resolveScheme } from '../theme/useTheme.js';
import {
  clockElapsedMs,
  clockRemainingSeconds,
  formatClock,
  isClockSpent,
} from '../utils/format.js';

describe('API errors', () => {
  it('keeps the API error code and message', () => {
    const error = {
      message: 'Request failed with status code 409',
      response: {
        status: 409,
        data: { success: false, error: { code: 'CONFLICT', message: 'Taken', details: { a: 1 } } },
      },
    };
    expect(normalizeError(error)).toEqual({
      status: 409,
      code: 'CONFLICT',
      message: 'Taken',
      details: { a: 1 },
    });
  });

  it('reports a request that never reached the API as a network error', () => {
    expect(normalizeError({ message: 'Network Error' })).toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('reports an answer without the API envelope as an HTTP error', () => {
    expect(
      normalizeError({ message: 'x', response: { status: 502, data: '<html>' } }),
    ).toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
    });
  });
});

describe('query retries', () => {
  it('retries network and server errors once, never client errors', () => {
    expect(shouldRetryQuery(0, { status: 0 })).toBe(true);
    expect(shouldRetryQuery(0, { status: 503 })).toBe(true);
    expect(shouldRetryQuery(1, { status: 503 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 404 })).toBe(false);
    expect(shouldRetryQuery(0, { status: 401 })).toBe(false);
  });
});

describe('clock helpers', () => {
  const T = Date.parse('2026-09-25T06:00:00.000Z');

  it('formats minutes and seconds and never goes negative', () => {
    expect(formatClock(605)).toBe('10:05');
    expect(formatClock(-3)).toBe('00:00');
  });

  it('counts the running segment and clamps the remaining time', () => {
    const clock = { elapsedMs: 60_000, runningSince: new Date(T).toISOString() };
    expect(clockElapsedMs(clock, T + 30_000)).toBe(90_000);
    expect(clockRemainingSeconds(clock, 1200, T + 30_000)).toBe(1110);
    expect(clockRemainingSeconds(clock, 100, T + 60_000)).toBe(0);
    expect(isClockSpent(clock, 100, T + 60_000)).toBe(true);
    expect(clockElapsedMs({ elapsedMs: 5_000, runningSince: null }, T)).toBe(5_000);
  });
});

describe('theme', () => {
  it('follows the system only while the theme is "system"', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
});

describe('app lifecycle', () => {
  it('treats only the foreground as focus and only a known-lost connection as offline', () => {
    expect(isForeground('active')).toBe(true);
    expect(isForeground('background')).toBe(false);
    expect(isOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(isOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
    expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('drives TanStack Query focus and online state from the app and the network', () => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appState.listener = listener;
      return { remove: jest.fn() };
    });
    startAppLifecycle();

    appState.listener('background');
    expect(focusManager.isFocused()).toBe(false);
    appState.listener('active');
    expect(focusManager.isFocused()).toBe(true);

    network.listener({ isConnected: false, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
    network.listener({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
  });
});
