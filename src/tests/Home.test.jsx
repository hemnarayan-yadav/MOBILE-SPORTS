jest.mock('../api/mobile.api.js', () => ({
  mobileApi: { home: jest.fn(), config: jest.fn() },
}));

import { QueryClientProvider } from '@tanstack/react-query';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { mobileApi } from '../api/mobile.api.js';
import Home from '../app/(tabs)/index.jsx';
import hi from '../i18n/locales/hi.json';
import i18n from '../i18n/index.js';
import { createQueryClient } from '../lib/queryClient.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { useUiStore } from '../store/uiStore.js';

// Home is one request now (GET /mobile/home). The server decides what is
// empty, so these tests hand it a payload and check what the screen does with
// it — never what it asked for, because it only ever asks for one thing.
//
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

const EMPTY_HOME = {
  live: [],
  matches: { recent: [], upcoming: [], completed: [] },
  featured: [],
  tournaments: { ongoing: [], upcoming: [], completed: [] },
  openTournaments: [],
  news: [],
  topPlayers: {},
  topTeams: [],
};

const homeWith = (over = {}) => ({ ...EMPTY_HOME, ...over });

// The header renders in the loading branch as well, so waiting for anything
// in it proves nothing — a test asserting a section is *absent* would pass
// while the request was still in flight. Every test waits for the screen to
// settle instead.
const settled = () =>
  waitFor(() => expect(screen.queryByText('Loading...')).toBeNull());

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
  mobileApi.home.mockReset();
  mobileApi.home.mockResolvedValue(EMPTY_HOME);
  useUiStore.setState({ theme: 'light', language: null });
  useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS, user: null });
  await act(() => i18n.changeLanguage('en'));
});

describe('Home asks once', () => {
  it('fetches the whole screen in a single request', async () => {
    await renderHome();
    await settled();

    // Six sections, one call. The point of the endpoint.
    expect(mobileApi.home).toHaveBeenCalledTimes(1);
  });
});

describe('Home (live)', () => {
  it('says nothing at all when no match is live', async () => {
    await renderHome();
    await settled();

    // No heading, no empty state: between matches the section is not there.
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.queryByText('No matches are live right now')).toBeNull();
  });

  it('shows the live section the moment a match is on the mat', async () => {
    mobileApi.home.mockResolvedValue(homeWith({ live: [LIVE_MATCH] }));
    await renderHome();

    expect(await screen.findByText('Shiva Raiders')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });
});

describe('Home (famous people)', () => {
  it('is not shown when nobody has been picked', async () => {
    await renderHome();
    await settled();
    expect(screen.queryByText('Spotlight')).toBeNull();
  });

  it('opens a linked player and leaves a standalone card alone', async () => {
    mobileApi.home.mockResolvedValue(
      homeWith({
        featured: [
          { id: 'f1', name: 'Roshan', photoUrl: null, title: 'raider', playerId: 'p1' },
          { id: 'f2', name: 'Anup Kumar', photoUrl: null, title: 'Arjuna Awardee', playerId: null },
        ],
      }),
    );
    await renderHome();

    await fireEvent.press(await screen.findByRole('button', { name: 'Roshan' }));
    expect(router.push).toHaveBeenCalledWith('/player/p1');

    // Somebody who is not on KhelScore has nothing to open, so the card is not
    // a button at all rather than one that does nothing.
    expect(screen.queryByRole('button', { name: 'Anup Kumar' })).toBeNull();
    expect(screen.getByText('Anup Kumar')).toBeTruthy();
  });
});

describe('Home (tabs that come and go)', () => {
  it('hides a tab with nothing in it, and shows no strip for a single tab', async () => {
    mobileApi.home.mockResolvedValue(
      homeWith({ matches: { recent: [], upcoming: [LIVE_MATCH], completed: [] } }),
    );
    await renderHome();
    // Wait for the content itself, not the header: the header is on screen
    // while the request is still running.
    expect(await screen.findByText('Shiva Raiders')).toBeTruthy();

    // One tab left: a choice of one is not a choice.
    expect(screen.queryByText('Recent')).toBeNull();
    expect(screen.queryByText('Completed')).toBeNull();
  });

  it('hides the whole section when every tab is empty', async () => {
    mobileApi.home.mockResolvedValue(
      homeWith({ tournaments: { ongoing: [], upcoming: [], completed: [] } }),
    );
    await renderHome();
    await settled();
    expect(screen.queryByText('Tournaments', { exact: true })).toBeNull();
  });
});

describe('Home (tournaments & news)', () => {
  const NOTICE = { id: 'n1', title: 'गाँव का टूर्नामेंट', startDate: '2026-11-02T00:00:00.000Z', prizes: [] };
  const ARTICLE = { id: 'a1', kind: 'external', title: 'कबड्डी की खबर', url: 'https://x.test/a', source: 'Bhaskar', publishedAt: null };

  it('opens on tournaments when there are any', async () => {
    mobileApi.home.mockResolvedValue(homeWith({ openTournaments: [NOTICE], news: [ARTICLE] }));
    await renderHome();

    expect(await screen.findByText('गाँव का टूर्नामेंट')).toBeTruthy();
    expect(screen.queryByText('कबड्डी की खबर')).toBeNull();
  });

  it('opens on news when there is no tournament to show', async () => {
    mobileApi.home.mockResolvedValue(homeWith({ openTournaments: [], news: [ARTICLE] }));
    await renderHome();

    // Opening on an empty tab while the other has something is exactly what
    // the rest of this screen refuses to do.
    expect(await screen.findByText('कबड्डी की खबर')).toBeTruthy();
  });

  it('keeps the tab the reader picked', async () => {
    mobileApi.home.mockResolvedValue(homeWith({ openTournaments: [NOTICE], news: [ARTICLE] }));
    await renderHome();
    await screen.findByText('गाँव का टूर्नामेंट');

    await fireEvent.press(screen.getByText('News'));

    expect(await screen.findByText('कबड्डी की खबर')).toBeTruthy();
    expect(screen.queryByText('गाँव का टूर्नामेंट')).toBeNull();
  });
});

describe('Home (the rest of the screen)', () => {
  it('shows a translated error, never the server text, and retries', async () => {
    mobileApi.home.mockRejectedValueOnce({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Network Error',
    });
    await renderHome();

    expect(await screen.findByText("Can't reach the server. Check your connection.")).toBeTruthy();
    expect(screen.queryByText('Network Error')).toBeNull();

    mobileApi.home.mockResolvedValue(homeWith({ live: [LIVE_MATCH] }));
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Shiva Raiders')).toBeTruthy();
  });

  it('switches the language to Hindi and remembers the choice', async () => {
    mobileApi.home.mockResolvedValue(
      homeWith({ matches: { recent: [], upcoming: [LIVE_MATCH], completed: [] } }),
    );
    await renderHome();
    await settled();

    await fireEvent.press(screen.getByRole('radio', { name: 'हिं' }));

    expect(await screen.findByText(hi.home.matchesTitle)).toBeTruthy();
    expect(useUiStore.getState().language).toBe('hi');
  });

  it('toggles the theme between Light and Dark (System is dropped)', async () => {
    await renderHome();
    await settled();

    await fireEvent.press(screen.getByRole('button', { name: /Theme: Light/ }));
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('shows the same person icon signed out and signed in, and still goes to both places', async () => {
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
    useAuthStore.setState({ status: AUTH_STATUS.UNKNOWN });
    await renderHome();
    await screen.findByLabelText('KhelScore');
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Account' })).toBeNull();
  });
});

describe('Home (signed-in shortcut)', () => {
  it('offers "Create your team" to a signed-in user without a team', async () => {
    useAuthStore.setState({
      status: AUTH_STATUS.AUTHENTICATED,
      user: { id: 'u1', name: 'Asha', role: 'user' },
    });
    await renderHome();
    await fireEvent.press(await screen.findByRole('button', { name: 'Create your team' }));
    expect(router.push).toHaveBeenCalledWith('/user/create-team');
  });

  it('offers "My team" to a captain, into the captain desk', async () => {
    useAuthStore.setState({
      status: AUTH_STATUS.AUTHENTICATED,
      user: { id: 'u2', name: 'Ravi', role: 'captain' },
    });
    await renderHome();
    await fireEvent.press(await screen.findByRole('button', { name: 'My team' }));
    expect(router.push).toHaveBeenCalledWith('/captain');
  });

  it('is hidden for signed-out visitors', async () => {
    await renderHome();
    await settled();
    expect(screen.queryByRole('button', { name: 'Create your team' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'My team' })).toBeNull();
  });
});
