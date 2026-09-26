// The match centre with real API snapshots (fixtures generated from the
// backend's serializers): the scoreboard, the sections of each status, the
// commentary and the reconnecting notice.
const mockSocket = { connected: true };
jest.mock('../hooks/useMatchSocket.js', () => ({ useMatchSocket: () => mockSocket }));

import { configure, fireEvent, screen, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import MatchScreen from '../app/match/[id].jsx';
import { getSportUI } from '../sports/index.js';
import completed from './fixtures/match-completed.json';
import live from './fixtures/match-live.json';
import upcoming from './fixtures/match-upcoming.json';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });

let api;
const nameOf = (match, id) => match.lineups.find((entry) => entry.player.id === id)?.player.name;

async function openMatch(match) {
  useLocalSearchParams.mockReturnValue({ id: match.id });
  api = fakeApi(({ url }) => {
    if (url === `/matches/${match.id}`) return ok(match);
    if (url === '/matches/head-to-head') {
      return ok({ played: 0, winsA: 0, winsB: 0, ties: 0, matches: [] });
    }
    return ok({});
  });
  await renderWithQuery(<MatchScreen />);
  await screen.findAllByText(match.teamA.name);
}

beforeEach(() => {
  resetSession();
  mockSocket.connected = true;
});
afterEach(() => api?.restore());

describe('live match', () => {
  it('shows the score, the half, who is raiding and the raid-by-raid commentary', async () => {
    await openMatch(live);

    expect(screen.getByLabelText(`${live.teamA.name} 2, ${live.teamB.name} 1`)).toBeTruthy();
    expect(screen.getByText('Half 1')).toBeTruthy();
    expect(
      screen.getByText(`${nameOf(live, live.live.currentRaid.raider)} is raiding`),
    ).toBeTruthy();
    // Newest first: raid 4 is a one-point touch, raid 2 was empty.
    const raid4 = live.live.raids.find((r) => r.raidNumber === 4);
    expect(
      screen.getByText(`${nameOf(live, raid4.raider)} touches 1 defender and gets back safely.`),
    ).toBeTruthy();
    const raid2 = live.live.raids.find((r) => r.raidNumber === 2);
    expect(screen.getByText(`Empty raid by ${nameOf(live, raid2.raider)}.`)).toBeTruthy();
  });

  it('switches to the lineups and the statistics', async () => {
    await openMatch(live);
    await fireEvent.press(screen.getByRole('tab', { name: 'Lineups' }));
    expect(screen.getAllByText('Starting 7')).toHaveLength(2);

    await fireEvent.press(screen.getByRole('tab', { name: 'Stats' }));
    const row = screen.getByLabelText(/^Total points:/);
    expect(within(row).getByText('2')).toBeTruthy();
  });

  it('says when the live connection is being restored', async () => {
    mockSocket.connected = false;
    await openMatch(live);
    expect(screen.getByText('Reconnecting…')).toBeTruthy();
  });
});

describe('upcoming match', () => {
  it('counts down and shows the match information and head-to-head', async () => {
    await openMatch(upcoming);
    expect(screen.getByText('Days')).toBeTruthy();
    expect(screen.getByText('Village Ground')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Head to head' }));
    expect(await screen.findByText("These teams haven't played each other yet.")).toBeTruthy();
  });
});

describe('completed match', () => {
  it('leads with the player of the match', async () => {
    await openMatch(completed);
    expect(screen.getByText('Player of the match')).toBeTruthy();
    expect(screen.getAllByText(completed.mvp.name).length).toBeGreaterThan(0);
    expect(screen.getByText('Full time')).toBeTruthy();
  });
});

describe('sport registry', () => {
  it('gives kabaddi its own UI and falls back to it for an unknown sport', () => {
    expect(getSportUI('kabaddi').teamStatRows).toContain('superTackles');
    expect(getSportUI('cricket')).toBe(getSportUI('kabaddi'));
  });
});
