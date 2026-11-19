// The five-raid tie-breaker on the phone: the strip while one is being played,
// and the line that names the side it sent through once the match is over.
//
// The app never records a tie-breaker — only the scorer's console does — so
// these are about reading one. The fixtures are the backend's own serializer
// output (match-live / match-completed) with the tie-breaker the API would add.
const mockSocket = { connected: true };
jest.mock('../hooks/useMatchSocket.js', () => ({ useMatchSocket: () => mockSocket }));

import { screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import MatchScreen from '../app/match/[id].jsx';
import { WinMargin } from '../components/match/MatchResult.jsx';
import completed from './fixtures/match-completed.json';
import live from './fixtures/match-live.json';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

let api;

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

// A match level at the buzzer, with the tie-breaker under way.
const inTieBreaker = (tieBreak) => ({
  ...live,
  teamAScore: 34,
  teamBScore: 34,
  live: { ...live.live, phase: 'tie_breaker', half: 2, score: { A: 34, B: 34 }, tieBreak },
});

// The same match, finished: tied, with the five raids recorded beside it.
const decidedByFiveRaids = {
  ...completed,
  teamAScore: 34,
  teamBScore: 34,
  isTie: true,
  winner: null,
  tieBreak: {
    winner: completed.teamB.id,
    teamAScore: 4,
    teamBScore: 6,
    teamARaids: 5,
    teamBRaids: 5,
  },
};

beforeEach(() => {
  resetSession();
  mockSocket.connected = true;
});
afterEach(() => api?.restore());

describe('a tie-breaker being played', () => {
  it('shows its own score and which raid of the five is next', async () => {
    await openMatch(
      inTieBreaker({
        raidsPerTeam: 5,
        score: { A: 3, B: 2 },
        raidsTaken: { A: 3, B: 2 },
        raids: [],
        suddenDeath: false,
        winner: null,
      }),
    );

    expect(screen.getByText('Five raids')).toBeTruthy();
    expect(screen.getByText('3 – 2')).toBeTruthy();
    expect(screen.getByText('Raid 3 of 5')).toBeTruthy();
    // The match score above it is the one the match was played to.
    expect(screen.getByLabelText('Team 2 34, Team 16 34')).toBeTruthy();
    expect(screen.getByText('Tie-breaker')).toBeTruthy();
  });

  it('says so when the five are level and it has gone to sudden death', async () => {
    await openMatch(
      inTieBreaker({
        raidsPerTeam: 5,
        score: { A: 5, B: 5 },
        raidsTaken: { A: 5, B: 5 },
        raids: [],
        suddenDeath: true,
        winner: null,
      }),
    );

    expect(screen.getByText('Sudden death')).toBeTruthy();
    expect(screen.queryByText('Raid 5 of 5')).toBeNull();
  });
});

describe('a match the five raids decided', () => {
  it('leads with the tie and names the side that goes through', async () => {
    await openMatch(decidedByFiveRaids);

    expect(screen.getAllByText('Match tied').length).toBeGreaterThan(0);
    expect(screen.getByText('Team 16 wins Five Raids 6–4')).toBeTruthy();
  });

  it('says nothing extra for a tie that was never taken to one', async () => {
    await openMatch({ ...completed, isTie: true, winner: null, tieBreak: null });

    expect(screen.getAllByText('Match tied').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Five Raids/)).toBeNull();
  });
});

// The same line on a card in a list, where there is no result band to carry it.
describe('a card in a list', () => {
  it('names the side the five raids sent through', async () => {
    await renderWithQuery(<WinMargin match={decidedByFiveRaids} />);

    expect(screen.getByText('Team 16 wins Five Raids 6–4')).toBeTruthy();
  });

  it('says nothing extra for a tie that was never taken to one', async () => {
    await renderWithQuery(<WinMargin match={{ ...completed, isTie: true, winner: null, tieBreak: null }} />);

    expect(screen.queryByText(/Five Raids/)).toBeNull();
  });

  it('still gives a match that was won its margin', async () => {
    await renderWithQuery(
      <WinMargin match={{ ...completed, isTie: false, winner: completed.teamA.id, teamAScore: 13, teamBScore: 9 }} />,
    );

    expect(screen.getByText('Won by 4 points')).toBeTruthy();
  });
});
