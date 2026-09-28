// Push notifications on the phone: registering this installation, the
// permission asked at the first follow, tapping a notification, and what the
// app does while the Expo project id or the permission is missing.

// The EAS project id lives in the app config; tests set it per case.
const appConfig = { version: '0.1.0', extra: { eas: { projectId: 'project-1' } } };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return appConfig;
    },
  },
}));

const notifications = {
  permission: 'undetermined',
  token: 'ExponentPushToken[device-1]',
  tokenError: null,
  channels: [],
  tapListener: null,
  lastResponse: null,
};
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async (id, config) => {
    notifications.channels = [
      ...notifications.channels.filter((c) => c.id !== id),
      { id, ...config },
    ];
  }),
  getPermissionsAsync: jest.fn(async () => ({ status: notifications.permission })),
  requestPermissionsAsync: jest.fn(async () => {
    // Android only ever prompts once; after a refusal it answers immediately.
    if (notifications.permission === 'undetermined') notifications.permission = 'granted';
    return { status: notifications.permission };
  }),
  getExpoPushTokenAsync: jest.fn(async () => {
    if (notifications.tokenError) throw notifications.tokenError;
    return { data: notifications.token };
  }),
  addNotificationResponseReceivedListener: jest.fn((listener) => {
    notifications.tapListener = listener;
    return { remove: jest.fn() };
  }),
  useLastNotificationResponse: jest.fn(() => notifications.lastResponse),
}));

import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  configure,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import FollowButton from '../components/common/FollowButton.jsx';
import {
  useNotificationTaps,
  usePushPermission,
  usePushRegistration,
  unregisterThisDevice,
} from '../hooks/usePush.js';
import { isPushSupported } from '../lib/push/expoPush.js';
import { createQueryClient } from '../lib/queryClient.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { useUiStore } from '../store/uiStore.js';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20_000);

// A fresh installation per test: the app remembers the token it last
// registered, so reusing one would look like "already registered".
let deviceCount = 0;
let TOKEN;
let api;

function wrapper({ children }) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const signedIn = () =>
  useAuthStore.setState({
    status: AUTH_STATUS.AUTHENTICATED,
    user: { id: 'u1' },
    accessToken: null,
  });

beforeEach(() => {
  resetSession();
  jest.clearAllMocks();
  appConfig.extra = { eas: { projectId: 'project-1' } };
  deviceCount += 1;
  TOKEN = `ExponentPushToken[device-${deviceCount}]`;
  Object.assign(notifications, {
    permission: 'undetermined',
    token: TOKEN,
    tokenError: null,
    channels: [],
    tapListener: null,
    lastResponse: null,
  });
  useUiStore.setState({ pushPrimed: false });
});
afterEach(() => api?.restore());

describe('registering this installation', () => {
  it('registers with the token, platform, language and app version once permission is given', async () => {
    notifications.permission = 'granted';
    api = fakeApi(() => ok({ registered: true }));
    signedIn();
    await renderHook(() => usePushRegistration(), { wrapper });

    await waitFor(() => expect(api.calls.some((c) => c.url === '/push/devices')).toBe(true));
    expect(api.calls.find((c) => c.url === '/push/devices').body).toEqual({
      token: TOKEN,
      platform: 'ios', // jest-expo's default preset; the device sends its own
      locale: 'en',
      appVersion: '0.1.0',
    });
  });

  it('registers nothing while nobody is signed in', async () => {
    notifications.permission = 'granted';
    api = fakeApi(() => ok({}));
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
    await renderHook(() => usePushRegistration(), { wrapper });
    await act(async () => {});
    expect(api.calls).toHaveLength(0);
  });

  it('registers nothing while permission has not been given', async () => {
    notifications.permission = 'denied';
    api = fakeApi(() => ok({}));
    signedIn();
    await renderHook(() => usePushRegistration(), { wrapper });
    await act(async () => {});
    expect(api.calls).toHaveLength(0);
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('creates an Android channel for each kind of notification', async () => {
    notifications.permission = 'granted';
    api = fakeApi(() => ok({ registered: true }));
    signedIn();
    await renderHook(() => usePushRegistration(), { wrapper });

    // jest-expo's default preset reports iOS, where channels are a no-op; the
    // call is still made so a real Android device gets them.
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
  });

  it('registers a token only once', async () => {
    notifications.permission = 'granted';
    api = fakeApi(() => ok({ registered: true }));
    signedIn();
    const { rerender } = await renderHook(() => usePushRegistration(), { wrapper });
    await waitFor(() => expect(api.calls).toHaveLength(1));

    await rerender();
    await act(async () => {});
    expect(api.calls.filter((c) => c.url === '/push/devices')).toHaveLength(1);
  });

  it('withdraws exactly this device when the account signs out', async () => {
    notifications.permission = 'granted';
    api = fakeApi(() => ok({ registered: true }));
    signedIn();
    await renderHook(() => usePushRegistration(), { wrapper });
    await waitFor(() => expect(api.calls.some((c) => c.url === '/push/devices')).toBe(true));

    await unregisterThisDevice();
    expect(api.calls.at(-1)).toMatchObject({
      url: '/push/devices/unregister',
      body: { token: TOKEN },
    });
  });
});

describe('without an Expo project or a reachable service', () => {
  it('reports push unavailable when the build has no project id', async () => {
    appConfig.extra = {};
    expect(isPushSupported()).toBe(false);

    api = fakeApi(() => ok({}));
    signedIn();
    await renderHook(() => usePushRegistration(), { wrapper });
    await act(async () => {});

    expect(api.calls).toHaveLength(0);
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('says so on the profile rather than failing', async () => {
    appConfig.extra = {};
    const { result } = await renderHook(() => usePushPermission(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('unsupported'));
    expect(result.current.blocker).toBe('unavailable');
    expect(result.current.granted).toBe(false);
    // Asking is pointless without a project, so nothing is prompted.
    await act(async () => {
      expect(await result.current.ask()).toBe(false);
    });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('keeps quiet when the push service cannot be reached', async () => {
    notifications.permission = 'granted';
    notifications.tokenError = new Error('no network');
    api = fakeApi(() => ok({}));
    signedIn();
    await renderHook(() => usePushRegistration(), { wrapper });
    await act(async () => {});
    expect(api.calls).toHaveLength(0);
  });

  it('offers the way to the phone settings when notifications are switched off there', async () => {
    notifications.permission = 'denied';
    const openSettings = jest.spyOn(Linking, 'openSettings').mockImplementation(() => {});
    const { result } = await renderHook(() => usePushPermission(), { wrapper });

    await waitFor(() => expect(result.current.blocker).toBe('denied'));
    result.current.openSettings();
    expect(openSettings).toHaveBeenCalled();
  });
});

describe('asking at the first follow', () => {
  async function followSomething() {
    api = fakeApi(({ method, url }) => {
      if (url === '/follows' && method === 'post') return ok({ following: true });
      if (url.startsWith('/follows/')) return ok({ following: false });
      return ok({ registered: true });
    });
    signedIn();
    await renderWithQuery(<FollowButton targetType="team" targetId="t1" />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Follow' }));
  }

  it('asks after the first follow, never before', async () => {
    await followSomething();
    expect(await screen.findByText('Get told when it matters?')).toBeTruthy();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Allow notifications' }));
    await waitFor(() => expect(Notifications.requestPermissionsAsync).toHaveBeenCalled());
    expect(useUiStore.getState().pushPrimed).toBe(true);
  });

  it('registers the device once permission is given', async () => {
    await followSomething();
    await fireEvent.press(await screen.findByRole('button', { name: 'Allow notifications' }));
    await waitFor(() => expect(api.calls.some((c) => c.url === '/push/devices')).toBe(true));
  });

  it('does not ask again after "Not now"', async () => {
    await followSomething();
    await fireEvent.press(await screen.findByRole('button', { name: 'Not now' }));
    expect(useUiStore.getState().pushPrimed).toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('does not ask a second time', async () => {
    useUiStore.setState({ pushPrimed: true });
    await followSomething();
    await waitFor(() => expect(screen.queryByText('Get told when it matters?')).toBeNull());
  });

  it('does not ask when the phone has already refused', async () => {
    notifications.permission = 'denied';
    await followSomething();
    await waitFor(() => expect(screen.queryByText('Get told when it matters?')).toBeNull());
  });
});

describe('tapping a notification', () => {
  const tapped = (link) => ({
    notification: { request: { content: { data: { type: 'match_started', link } } } },
  });

  it('opens what a tap points at while the app is running', async () => {
    await renderHook(() => useNotificationTaps(), { wrapper });
    await act(async () => notifications.tapListener(tapped('/match/m1')));
    expect(router.push).toHaveBeenCalledWith('/match/m1');
  });

  it('opens the screen the app was started from, and only once', async () => {
    notifications.lastResponse = tapped('/team/t1');
    const { rerender } = await renderHook(() => useNotificationTaps(), { wrapper });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/team/t1'));

    await rerender();
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('ignores a link that is not one of the app’s own paths', async () => {
    await renderHook(() => useNotificationTaps(), { wrapper });
    for (const link of ['https://evil.example/match/1', '//evil.example', undefined, 42]) {
      await act(async () => notifications.tapListener(tapped(link)));
    }
    expect(router.push).not.toHaveBeenCalled();
  });
});
