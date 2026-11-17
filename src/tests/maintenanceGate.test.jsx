// The kill switch as the app obeys it: what it blocks, what it deliberately
// does not, and the two cases that would otherwise lock somebody out for good.
// `mock`-prefixed, which is the only kind of variable a jest.mock factory may
// reach for.
const mockRoute = { segments: ['(tabs)'] };
jest.mock('expo-router', () => ({ useSegments: () => mockRoute.segments }));

import { screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import MaintenanceGate from '../components/common/MaintenanceGate.jsx';
import i18n from '../i18n/index.js';
import { useAuthStore } from '../store/authStore.js';
import { fail, fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

const app = <Text>the app</Text>;

const config = (maintenance) =>
  ok({
    minSupportedVersion: { android: '0.0.1' },
    latestVersion: { android: null },
    maintenance: {
      enabled: false,
      scope: 'auth',
      onApp: true,
      onWeb: true,
      messageEn: null,
      messageHi: null,
      ...maintenance,
    },
  });

let api;

beforeEach(async () => {
  mockRoute.segments = ['(tabs)'];
  resetSession();
  await i18n.changeLanguage('en');
});

afterEach(() => {
  api?.restore();
});

const show = async (maintenance) => {
  api = fakeApi(() => config(maintenance));
  await renderWithQuery(<MaintenanceGate>{app}</MaintenanceGate>);
  await waitFor(() => expect(api.calls).toHaveLength(1));
};

describe('the maintenance gate', () => {
  it('runs the app while the switch is off', async () => {
    await show({ enabled: false });
    expect(screen.getByText('the app')).toBeTruthy();
  });

  it('stops everything on the `app` scope, wherever the person is', async () => {
    await show({ enabled: true, scope: 'app' });

    expect(await screen.findByText('Back shortly')).toBeTruthy();
    expect(screen.queryByText('the app')).toBeNull();
  });

  it('on the `auth` scope stops only the screens that spend an OTP', async () => {
    mockRoute.segments = ['auth'];
    await show({ enabled: true, scope: 'auth' });

    expect(await screen.findByText('Sign-in is paused')).toBeTruthy();
    expect(screen.queryByText('the app')).toBeNull();
  });

  it('leaves the rest of the app — and a live match — alone on the `auth` scope', async () => {
    mockRoute.segments = ['match'];
    await show({ enabled: true, scope: 'auth' });

    expect(screen.getByText('the app')).toBeTruthy();
  });

  it('shows the Super Admin’s own words, in the language being read', async () => {
    await i18n.changeLanguage('hi');
    await show({
      enabled: true,
      scope: 'app',
      messageEn: 'The OTP provider is down.',
      messageHi: 'OTP भेजने वाली सेवा बंद है।',
    });

    expect(await screen.findByText('OTP भेजने वाली सेवा बंद है।')).toBeTruthy();
    expect(screen.queryByText('The OTP provider is down.')).toBeNull();
  });

  it('falls back to its own wording when nobody had time to write any', async () => {
    await show({ enabled: true, scope: 'app', messageEn: '   ' });

    expect(
      await screen.findByText('We are fixing something on our side. Please try again in a little while.'),
    ).toBeTruthy();
  });

  it('never blocks a Super Admin — the switch is turned off from inside the app', async () => {
    useAuthStore.setState({ user: { id: 'u1', role: 'super_admin' } });

    await show({ enabled: true, scope: 'app' });

    expect(screen.getByText('the app')).toBeTruthy();
  });

  it('ignores a switch aimed at the website only', async () => {
    // One setting drives both clients, and the two are not always broken
    // together.
    await show({ enabled: true, scope: 'app', onApp: false, onWeb: true });

    expect(screen.getByText('the app')).toBeTruthy();
  });

  it('fails open: no answer from the API runs the app', async () => {
    // A switch that reads "unknown" as "blocked" turns one outage into two.
    api = fakeApi(() => fail(503, 'NOT_READY'));
    await renderWithQuery(<MaintenanceGate>{app}</MaintenanceGate>);
    await waitFor(() => expect(api.calls).toHaveLength(1));

    expect(screen.getByText('the app')).toBeTruthy();
  });
});
