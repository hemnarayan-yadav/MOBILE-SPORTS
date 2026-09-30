jest.mock('../api/matches.api.js', () => ({
  matchesApi: { list: jest.fn() },
  rankingsApi: { overview: jest.fn() },
}));
jest.mock('../api/tournaments.api.js', () => ({
  tournamentsApi: { list: jest.fn() },
}));

import { QueryClientProvider } from '@tanstack/react-query';
import { act, configure, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { matchesApi, rankingsApi } from '../api/matches.api.js';
import { tournamentsApi } from '../api/tournaments.api.js';
import Home from '../app/(tabs)/index.jsx';
import hi from '../i18n/locales/hi.json';
import i18n from '../i18n/index.js';
import { createQueryClient } from '../lib/queryClient.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { useUiStore } from '../store/uiStore.js';

// The default 1 s wait for `findBy…` ran out once on a busy machine (a Gradle
// build alongside); a longer limit only costs time when something is slow.
configure({ asyncUtilTimeout: 5000 });

const LIVE_MATCH = {
  id: 'm1',
  status: 'live',
  tournament: { id: 't1', name: 'Village Cup' },
  round: 'final',
  roundLabel: null,
  teamA: { id: 'a', name: 'Shiva Raiders' },
  teamB: { id: 'b', name: 'Gaon Warriors' },
  teamAScore: 12,
  teamBScore: 9,
  phase: 'first_half',
  half: 1,
  clock: { elapsedMs: 300_000, runningSince: null },
};

const EMPTY_OVERVIEW = {
  best_raider: { entries: [] },
  best_defender: { entries: [] },
  best_allrounder: { entries: [] },
  computedAt: null,
};

async function renderHome() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  return render(
    <QueryClientProvider client={client}>
      <Home />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  matchesApi.list.mockReset();
  rankingsApi.overview.mockReset();
  tournamentsApi.list.mockReset();
  // The store no longer holds 'system' after launch-readiness item #3; a
  // fresh install now starts on the resolved scheme (Light in tests).
  useUiStore.setState({ theme: 'light', language: null });
  useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS, user: null });
  // Default: empty everything so a test only mocks what it asserts on.
  rankingsApi.overview.mockResolvedValue(EMPTY_OVERVIEW);
  tournamentsApi.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
  await act(() => i18n.changeLanguage('en'));
});

describe('Home (matches preview)', () => {
  it('asks the API for the first 5 live matches and lists them with score, phase and clock', async () => {
    matchesApi.list.mockResolvedValue({ items: [LIVE_MATCH], pagination: { total: 1 } });
    await renderHome();

    expect(await screen.findByText('Shiva Raiders')).toBeTruthy();
    expect(matchesApi.list).toHaveBeenCalledWith({ status: 'live', limit: 5 });
    expect(screen.getByText('Gaon Warriors')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    // The tournament and the round are their own lines now, so a knockout
    // round can carry its own colour.
    expect(screen.getByText('Village Cup')).toBeTruthy();
    expect(screen.getByText('FINAL')).toBeTruthy();
    expect(screen.getByText('Half 1')).toBeTruthy();
    expect(screen.getByText('15:00')).toBeTruthy(); // 20-minute half, 5 minutes played, paused
  });

  it('says so when nothing is live', async () => {
    matchesApi.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
    await renderHome();
    expect(await screen.findByText('No matches are live right now')).toBeTruthy();
  });

  it('shows a translated error, never the server text, and retries', async () => {
    matchesApi.list.mockRejectedValueOnce({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Network Error',
    });
    await renderHome();

    expect(await screen.findByText("Can't reach the server. Check your connection.")).toBeTruthy();
    expect(screen.queryByText('Network Error')).toBeNull();

    matchesApi.list.mockResolvedValue({ items: [LIVE_MATCH] });
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Shiva Raiders')).toBeTruthy();
  });

  it('switches the language to Hindi and remembers the choice', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    await renderHome();
    await screen.findByText('Matches');

    await fireEvent.press(screen.getByRole('radio', { name: 'हिं' }));

    expect(await screen.findByText(hi.home.matchesTitle)).toBeTruthy();
    expect(useUiStore.getState().language).toBe('hi');
  });

  it('toggles the theme between Light and Dark (System is dropped)', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    await renderHome();
    await screen.findByText('Matches');

    await fireEvent.press(screen.getByRole('button', { name: 'Theme: Light. Tap to change' }));
    expect(useUiStore.getState().theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Theme: Dark. Tap to change' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Theme: Dark. Tap to change' }));
    expect(useUiStore.getState().theme).toBe('light');
  });

  it('offers a sign-in icon when signed out and an account icon when signed in', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS, user: null });
    await renderHome();
    await fireEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    expect(router.push).toHaveBeenCalledWith('/auth/login');

    await act(() =>
      useAuthStore.setState({
        status: AUTH_STATUS.AUTHENTICATED,
        user: { id: 'u1', name: 'Asha', role: 'user' },
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
    expect(router.push).toHaveBeenCalledWith('/dashboard/profile');
  });

  it('shows neither icon while the stored session is still being restored', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    useAuthStore.setState({ status: AUTH_STATUS.UNKNOWN });
    await renderHome();
    await screen.findByText('Matches');
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Account' })).toBeNull();
  });
});

describe('Home (signed-in shortcut)', () => {
  it('offers "Create your team" to a signed-in user without a team', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    useAuthStore.setState({
      status: AUTH_STATUS.AUTHENTICATED,
      user: { id: 'u1', name: 'Asha', role: 'user' },
    });
    await renderHome();
    await fireEvent.press(await screen.findByRole('button', { name: 'Create your team' }));
    expect(router.push).toHaveBeenCalledWith('/user/create-team');
  });

  it('offers "My team" to a captain, into the captain desk', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    useAuthStore.setState({
      status: AUTH_STATUS.AUTHENTICATED,
      user: { id: 'u2', name: 'Ravi', role: 'captain' },
    });
    await renderHome();
    await fireEvent.press(await screen.findByRole('button', { name: 'My team' }));
    expect(router.push).toHaveBeenCalledWith('/captain');
  });

  it('is hidden for signed-out visitors', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    await renderHome();
    await screen.findByText('Matches');
    expect(screen.queryByRole('button', { name: 'Create your team' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'My team' })).toBeNull();
  });
});

describe('Home (tournaments and leaders)', () => {
  it('shows the tournaments empty state when the API returns none', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    tournamentsApi.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
    await renderHome();
    expect(await screen.findByText('No tournaments open yet')).toBeTruthy();
    // The list is capped for a Home preview (item #2 rule: no big lists on Home).
    expect(tournamentsApi.list).toHaveBeenCalledWith({ limit: 4 });
  });

  it('shows the leaders empty state with the "waiting for matches" hint', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    rankingsApi.overview.mockResolvedValue(EMPTY_OVERVIEW);
    await renderHome();
    expect(await screen.findByText('No rankings yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Waiting for the first matches — rankings appear once matches are completed.',
      ),
    ).toBeTruthy();
    expect(rankingsApi.overview).toHaveBeenCalledWith({ limit: 3 });
  });
});
