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

const UPCOMING_MATCH = {
  id: 'm2',
  status: 'upcoming',
  tournament: { id: 't1', name: 'Village Cup' },
  round: 'league',
  roundLabel: null,
  teamA: { id: 'c', name: 'Dhamdha Risers' },
  teamB: { id: 'd', name: 'Hirmi' },
  teamAScore: null,
  teamBScore: null,
  scheduledAt: '2026-11-02T10:00:00.000Z',
};

const COMPLETED_MATCH = {
  id: 'm3',
  status: 'completed',
  tournament: { id: 't1', name: 'Village Cup' },
  round: 'league',
  roundLabel: null,
  teamA: { id: 'e', name: 'Allbaras' },
  teamB: { id: 'f', name: 'Hirmi' },
  teamAScore: 19,
  teamBScore: 18,
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

  // Live is the right tab to open on while a match is on the mat, and an empty
  // one every other hour of the day. Home now walks the tabs and opens on the
  // first that has something. Play review saw an app whose every section was
  // empty (rejected 2026-10-22); landing on a dead tab by default is the same
  // impression for anyone opening the app between matches.
  it('falls through to upcoming when nothing is live', async () => {
    matchesApi.list.mockImplementation(({ status }) =>
      Promise.resolve(
        status === 'upcoming'
          ? { items: [UPCOMING_MATCH], pagination: { total: 1 } }
          : { items: [], pagination: { total: 0 } },
      ),
    );
    await renderHome();

    expect(await screen.findByText('Dhamdha Risers')).toBeTruthy();
    expect(matchesApi.list).toHaveBeenCalledWith({ status: 'live', limit: 5 });
    expect(matchesApi.list).toHaveBeenCalledWith({ status: 'upcoming', limit: 5 });
  });

  it('falls through again to the last 24 hours when live and upcoming are both empty', async () => {
    matchesApi.list.mockImplementation(({ status }) =>
      Promise.resolve(
        status === 'completed'
          ? { items: [COMPLETED_MATCH], pagination: { total: 1 } }
          : { items: [], pagination: { total: 0 } },
      ),
    );
    await renderHome();

    expect(await screen.findByText('Allbaras')).toBeTruthy();
    expect(matchesApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', limit: 5 }),
    );
  });

  it('settles on upcoming, not completed, when every tab is empty', async () => {
    matchesApi.list.mockResolvedValue({ items: [], pagination: { total: 0 } });
    await renderHome();

    // "Check back soon" is a kinder place to leave a reader than "nothing
    // finished today", and the walk must stop rather than cycle for ever.
    expect(await screen.findByText('No upcoming matches')).toBeTruthy();
    expect(screen.queryByText('No matches are live right now')).toBeNull();
  });

  it('stays on the tab the reader picked, even when it is empty', async () => {
    matchesApi.list.mockImplementation(({ status }) =>
      Promise.resolve(
        status === 'upcoming'
          ? { items: [UPCOMING_MATCH], pagination: { total: 1 } }
          : { items: [], pagination: { total: 0 } },
      ),
    );
    await renderHome();
    expect(await screen.findByText('Dhamdha Risers')).toBeTruthy();

    await fireEvent.press(screen.getByText('Live'));

    // Their choice outranks the fallback: it must not bounce them back.
    expect(await screen.findByText('No matches are live right now')).toBeTruthy();
    expect(screen.queryByText('Dhamdha Risers')).toBeNull();
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

    // The button shows the mode it is in — a sun in Light, a moon in Dark —
    // and names it in words only to a screen reader.
    expect(screen.getByTestId('ionicon-sunny-outline')).toBeTruthy();
    expect(screen.queryByText('Light')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Theme: Light. Tap to change' }));
    expect(useUiStore.getState().theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Theme: Dark. Tap to change' })).toBeTruthy();
    expect(screen.getByTestId('ionicon-moon-outline')).toBeTruthy();
    expect(screen.queryByTestId('ionicon-sunny-outline')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Theme: Dark. Tap to change' }));
    expect(useUiStore.getState().theme).toBe('light');
    expect(screen.getByTestId('ionicon-sunny-outline')).toBeTruthy();
  });

  it('shows the same person icon signed out and signed in, and still goes to both places', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS, user: null });
    await renderHome();
    expect(await screen.findByTestId('ionicon-person-circle-outline')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(router.push).toHaveBeenCalledWith('/auth/login');

    await act(() =>
      useAuthStore.setState({
        status: AUTH_STATUS.AUTHENTICATED,
        user: { id: 'u1', name: 'Asha', role: 'user' },
      }),
    );
    // The same glyph — only the label and where it leads change.
    expect(screen.getByTestId('ionicon-person-circle-outline')).toBeTruthy();
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
