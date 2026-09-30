import { screen } from '@testing-library/react-native';
import MatchCard from '../components/match/MatchCard.jsx';
import ChampionBanner, { ChampionLine } from '../components/tournament/ChampionBanner.jsx';
import { TournamentCard } from '../components/tournament/TournamentBits.jsx';
import '../i18n/index.js';
import { isKnockoutRound, roundName } from '../utils/rounds.js';
import { renderWithQuery, resetSession } from './helpers.jsx';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

const CHAMPION = {
  id: 't1',
  name: 'Rohtak Raiders',
  shortName: 'RKR',
  logoUrl: null,
  status: 'active',
};
const PLAYER = { id: 'p1', name: 'Pardeep Narwal', photoUrl: null };

const tournament = (extra = {}) => ({
  id: 'tr1',
  name: 'Durg Kabaddi League',
  season: '2026',
  status: 'completed',
  bannerUrl: null,
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2026-09-20T00:00:00.000Z',
  teamsCount: 4,
  maxTeams: null,
  champion: null,
  playerOfTournament: null,
  ...extra,
});

const match = (extra = {}) => ({
  id: 'm1',
  status: 'completed',
  tournament: { id: 'tr1', name: 'Durg Kabaddi League' },
  round: null,
  roundLabel: null,
  teamA: { id: 'a', name: 'Rohtak Raiders', shortName: 'RKR', logoUrl: null, status: 'active' },
  teamB: { id: 'b', name: 'Sonipat Stars', shortName: 'SNS', logoUrl: null, status: 'active' },
  teamAScore: 40,
  teamBScore: 30,
  winner: 'a',
  isTie: false,
  scheduledAt: '2026-09-20T10:00:00.000Z',
  venue: 'Rohtak',
  rules: { firstHalfDurationSeconds: 1200, secondHalfDurationSeconds: 1200 },
  ...extra,
});

beforeEach(resetSession);

describe('how a round reads', () => {
  const t = (key) => key;

  it('translates a listed round, names an "other" one, and says nothing for none', () => {
    expect(roundName({ round: 'semi_final' }, t)).toBe('round.semi_final');
    expect(roundName({ round: 'other', roundLabel: 'Group B' }, t)).toBe('Group B');
    expect(roundName({ round: null }, t)).toBe(null);
  });

  it('shows a round it does not know as it came, never as a translation key', () => {
    expect(roundName({ round: 'Semi-final' }, t)).toBe('Semi-final');
  });

  it('marks only the knockout rounds', () => {
    expect(isKnockoutRound('final')).toBe(true);
    expect(isKnockoutRound('league')).toBe(false);
  });
});

describe('a match card', () => {
  it('shows the round on its own line', async () => {
    await renderWithQuery(<MatchCard match={match({ round: 'final' })} />);
    expect(screen.getByText('Durg Kabaddi League')).toBeTruthy();
    expect(screen.getByText('FINAL')).toBeTruthy();
  });

  it('shows the tournament’s own name for an "other" round', async () => {
    await renderWithQuery(<MatchCard match={match({ round: 'other', roundLabel: 'Group B' })} />);
    expect(screen.getByText('GROUP B')).toBeTruthy();
  });

  it('shows no round line for a match without one', async () => {
    await renderWithQuery(<MatchCard match={match()} />);
    expect(screen.queryByText('FINAL')).toBeNull();
  });
});

describe('the champion banner', () => {
  it('names the winning team and the player of the tournament', async () => {
    await renderWithQuery(
      <ChampionBanner
        tournament={tournament({ champion: CHAMPION, playerOfTournament: PLAYER })}
      />,
    );

    expect(screen.getByText('Champions')).toBeTruthy();
    expect(screen.getByText('Rohtak Raiders')).toBeTruthy();
    expect(screen.getByText('Player of the Tournament')).toBeTruthy();
    expect(screen.getByText('Pardeep Narwal')).toBeTruthy();
  });

  it('shows the winner on its own when there is no player of the tournament', async () => {
    await renderWithQuery(<ChampionBanner tournament={tournament({ champion: CHAMPION })} />);
    expect(screen.getByText('Rohtak Raiders')).toBeTruthy();
    expect(screen.queryByText('Player of the Tournament')).toBeNull();
  });

  it('renders nothing when the tournament produced no result', async () => {
    const view = await renderWithQuery(<ChampionBanner tournament={tournament()} />);
    expect(view.toJSON()).toBeNull();
  });

  it('puts the winner on one line for a card', async () => {
    await renderWithQuery(<ChampionLine champion={CHAMPION} />);
    expect(screen.getByText('Winner: Rohtak Raiders')).toBeTruthy();
  });
});

describe('a tournament card', () => {
  it('shows the winner without opening the tournament', async () => {
    await renderWithQuery(<TournamentCard tournament={tournament({ champion: CHAMPION })} />);
    expect(screen.getByText('Winner: Rohtak Raiders')).toBeTruthy();
  });

  it('says nothing about a winner while the tournament is still running', async () => {
    await renderWithQuery(<TournamentCard tournament={tournament({ status: 'ongoing' })} />);
    expect(screen.queryByText(/Winner:/)).toBeNull();
  });
});
