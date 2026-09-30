import { screen } from '@testing-library/react-native';
import '../i18n/index.js';
import {
  LeaderboardList,
  RankBadge,
  StandingsTable,
} from '../components/tournament/TournamentBits.jsx';
import { ChampionLine } from '../components/tournament/ChampionBanner.jsx';
import { COLORS } from '../theme/tokens.js';
import { PODIUM, TOP_TEN, isHighlighted, medalOf, rankTone } from '../utils/medals.js';
import { roundTone } from '../utils/rounds.js';
import { renderWithQuery, resetSession } from './helpers.jsx';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

const AA = 4.5;
const MEDALS = ['gold', 'silver', 'bronze'];
const THEMES = ['light', 'dark'];

// `rgb(190, 150, 30)` / `rgba(190, 150, 30, 0.4)` -> [190, 150, 30]
const parse = (value) => value.match(/\d+/g).slice(0, 3).map(Number);

const channel = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

function contrast(a, b) {
  const [hi, lo] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

beforeEach(resetSession);

describe('who is on the podium', () => {
  it('names the three medals in order', () => {
    expect(medalOf(1)).toBe('gold');
    expect(medalOf(2)).toBe('silver');
    expect(medalOf(3)).toBe('bronze');
    expect(PODIUM).toBe(3);
  });

  it('gives no medal off the podium', () => {
    expect(medalOf(4)).toBeNull();
    expect(medalOf(0)).toBeNull();
  });

  it('highlights ranks 4 to 10 and nothing else', () => {
    expect(isHighlighted(3)).toBe(false);
    expect(isHighlighted(4)).toBe(true);
    expect(isHighlighted(TOP_TEN)).toBe(true);
    expect(isHighlighted(TOP_TEN + 1)).toBe(false);
  });
});

describe('what one rank looks like', () => {
  const colors = COLORS.light;

  it('fills a medal badge with its own colour and writes it in ink', () => {
    expect(rankTone(1, colors).badge).toBe(colors.gold);
    expect(rankTone(2, colors).badge).toBe(colors.silver);
    expect(rankTone(3, colors).badge).toBe(colors.bronze);
    expect(rankTone(1, colors).badgeTone).toBe('ink');
  });

  it('gives a medal badge a rim of its own colour, and everything else none', () => {
    expect(rankTone(1, colors).rim).toBe('rgba(190, 150, 30, 0.4)');
    expect(rankTone(11, colors).rim).toBe('transparent');
  });

  it('tints a medal row in its own colour, so the podium out-ranks the band', () => {
    expect(rankTone(1, colors).row).toBe('rgba(190, 150, 30, 0.12)');
    expect(rankTone(4, colors).row).toBe(colors.brandSoft);
    expect(rankTone(11, colors).row).toBe('transparent');
  });

  it('gives an unranked row the plain disc', () => {
    expect(rankTone(11, colors).badge).toBe(colors.surface2);
    expect(rankTone(11, colors).badgeTone).toBe('muted');
  });
});

describe('the medal tokens are readable', () => {
  it.each(MEDALS)('carries ink text on the %s badge in both themes', (medal) => {
    for (const theme of THEMES) {
      const ratio = contrast(COLORS[theme][medal], COLORS[theme].ink);
      expect(ratio).toBeGreaterThanOrEqual(AA);
    }
  });

  it.each(MEDALS)('can be written in as %sStrong on a surface in both themes', (medal) => {
    for (const theme of THEMES) {
      const ratio = contrast(COLORS[theme][`${medal}Strong`], COLORS[theme].surface);
      expect(ratio).toBeGreaterThanOrEqual(AA);
    }
  });

  // This is why the pair exists, and why the round label and the champion line
  // must not be drawn in the fill.
  it.each(MEDALS)('does not pretend the %s fill is a text colour in light mode', (medal) => {
    expect(contrast(COLORS.light[medal], COLORS.light.surface)).toBeLessThan(AA);
  });

  it('matches the web, whose index.css these values are ported from', () => {
    expect(COLORS.light.gold).toBe('rgb(190, 150, 30)');
    expect(COLORS.light.bronze).toBe('rgb(196, 124, 62)');
    expect(COLORS.light.bronzeStrong).toBe('rgb(150, 82, 30)');
    // On a dark surface a medal is already legible as itself.
    expect(COLORS.dark.goldStrong).toBe(COLORS.dark.gold);
  });
});

describe('what writes a medal in text', () => {
  it('draws a knockout round in the strong variant, and its border in the fill', () => {
    const tone = roundTone('final', COLORS.light);
    expect(tone.color).toBe(COLORS.light.goldStrong);
    expect(tone.border).toBe(COLORS.light.gold);
    expect(roundTone('semi_final', COLORS.light).color).toBe(COLORS.light.silverStrong);
    expect(roundTone('quarter_final', COLORS.light).color).toBe(COLORS.light.bronzeStrong);
  });

  it('has no tone for a round that is not a knockout', () => {
    expect(roundTone('league', COLORS.light)).toBeNull();
    expect(roundTone(null, COLORS.light)).toBeNull();
  });
});

const entry = (rank) => ({
  rank,
  score: 100 - rank,
  matches: 5,
  metrics: { raidSuccessRate: 0.5, tackleSuccessRate: 0.4 },
  // The API always sends the pair, never null (backend utils/location.js).
  player: {
    id: `p${rank}`,
    name: `Player ${rank}`,
    photoUrl: null,
    location: { state: null, district: null },
  },
  team: { id: 't1', name: 'Rohtak Raiders', shortName: 'RKR', logoUrl: null, status: 'active' },
});

const standingsRow = (rank) => ({
  rank,
  team: {
    id: `t${rank}`,
    name: `Team ${rank}`,
    shortName: `T${rank}`,
    logoUrl: null,
    status: 'active',
  },
  played: 5,
  won: 3,
  lost: 1,
  tied: 1,
  scoreDiff: 8,
  points: 20 - rank,
});

// The background colour a rendered row ends up with, out of its flattened style.
const backgroundOf = (node) =>
  [node.props.style].flat(3).find((s) => s?.backgroundColor)?.backgroundColor;

describe('the badge', () => {
  it('shows the rank as text, so the medal is never the only thing saying it', async () => {
    await renderWithQuery(<RankBadge rank={1} />);
    expect(screen.getByText('1')).toBeTruthy();
  });
});

describe('a player leaderboard', () => {
  it('medals the top three, bands 4 to 10 and leaves the rest plain', async () => {
    await renderWithQuery(
      <LeaderboardList entries={[1, 2, 3, 4, 11].map(entry)} category="best_raider" />,
    );

    const rows = screen.getAllByRole('button');
    const colorOf = (i) => backgroundOf(rows[i]);
    expect(colorOf(0)).toBe('rgba(190, 150, 30, 0.12)');
    expect(colorOf(1)).toBe('rgba(140, 148, 160, 0.12)');
    expect(colorOf(2)).toBe('rgba(196, 124, 62, 0.12)');
    expect(colorOf(3)).toBe(COLORS.light.brandSoft);
    expect(colorOf(4)).toBe('transparent');
  });
});

describe('the points table', () => {
  // It is a leaderboard too, and used to apply only half the rule: medals but
  // no band.
  it('follows the same rule as the player leaderboards', async () => {
    await renderWithQuery(<StandingsTable rows={[1, 4, 11].map(standingsRow)} />);

    const rows = screen.getAllByRole('button');
    const colorOf = (i) => backgroundOf(rows[i]);
    expect(colorOf(0)).toBe('rgba(190, 150, 30, 0.12)');
    expect(colorOf(1)).toBe(COLORS.light.brandSoft);
    expect(colorOf(2)).toBe('transparent');
  });
});

describe('the champion line', () => {
  it('is drawn in the strong variant', async () => {
    await renderWithQuery(<ChampionLine champion={{ id: 't1', name: 'Rohtak Raiders' }} />);
    const text = screen.getByText(/Rohtak Raiders/);
    expect([text.props.style].flat(3).some((s) => s?.color === COLORS.light.goldStrong)).toBe(true);
  });
});
