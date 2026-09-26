jest.mock('../api/matches.api.js', () => ({ matchesApi: { list: jest.fn() } }));

import { QueryClientProvider } from '@tanstack/react-query';
import { act, configure, fireEvent, render, screen } from '@testing-library/react-native';
import { matchesApi } from '../api/matches.api.js';
import Home from '../app/index.jsx';
import hi from '../i18n/locales/hi.json';
import i18n from '../i18n/index.js';
import { createQueryClient } from '../lib/queryClient.js';
import { useUiStore } from '../store/uiStore.js';

// The default 1 s wait for `findBy…` ran out once on a busy machine (a Gradle
// build alongside); a longer limit only costs time when something is slow.
configure({ asyncUtilTimeout: 5000 });

const LIVE_MATCH = {
  id: 'm1',
  status: 'live',
  tournament: { id: 't1', name: 'Village Cup' },
  round: 'Final',
  teamA: { id: 'a', name: 'Shiva Raiders' },
  teamB: { id: 'b', name: 'Gaon Warriors' },
  teamAScore: 12,
  teamBScore: 9,
  phase: 'first_half',
  half: 1,
  clock: { elapsedMs: 300_000, runningSince: null },
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
  useUiStore.setState({ theme: 'system', language: null });
  await act(() => i18n.changeLanguage('en'));
});

describe('Home (live matches)', () => {
  it('asks the API for live matches and lists them with score, phase and clock', async () => {
    matchesApi.list.mockResolvedValue({ items: [LIVE_MATCH], pagination: { total: 1 } });
    await renderHome();

    expect(await screen.findByText('Shiva Raiders')).toBeTruthy();
    expect(matchesApi.list).toHaveBeenCalledWith({ status: 'live', limit: 20 });
    expect(screen.getByText('Gaon Warriors')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Village Cup · Final')).toBeTruthy();
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
    await screen.findByText('Live now');

    await fireEvent.press(screen.getByRole('radio', { name: 'हिं' }));

    expect(await screen.findByText(hi.home.liveNow)).toBeTruthy();
    expect(useUiStore.getState().language).toBe('hi');
  });

  it('cycles the theme and names it in words', async () => {
    matchesApi.list.mockResolvedValue({ items: [] });
    await renderHome();
    await screen.findByText('Live now');

    await fireEvent.press(screen.getByRole('button', { name: 'Theme: System. Tap to change' }));
    expect(useUiStore.getState().theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Theme: Light. Tap to change' })).toBeTruthy();
  });
});
