import { screen, within } from '@testing-library/react-native';
import { StandingsTable } from '../components/tournament/TournamentBits.jsx';
import { renderWithQuery } from './helpers.jsx';

// The points table's form: each team's latest results as small circles under
// its name, newest first (the API's `form`), and in the row's description.
const row = (rank, form) => ({
  rank,
  team: { id: `t${rank}`, name: `Team ${rank}`, shortName: `T${rank}` },
  played: 5,
  won: 3,
  lost: 2,
  tied: 0,
  scoreDiff: 12,
  points: 6,
  form,
});

describe('the points table form', () => {
  it('shows each result under the team, newest first', async () => {
    await renderWithQuery(<StandingsTable rows={[row(1, ['win', 'loss', 'win'])]} />);
    const team = screen.getByRole('button');
    const letters = within(team)
      .getAllByText(/^[WLT]$/, { includeHiddenElements: true })
      .map((node) => node.props.children);
    expect(letters).toEqual(['W', 'L', 'W']);
  });

  it('reads the form out as part of the row', async () => {
    await renderWithQuery(<StandingsTable rows={[row(1, ['win', 'loss'])]} />);
    expect(screen.getByRole('button', { name: /Points 6, Latest results, newest first: W, L$/ })).toBeTruthy();
  });

  it('shows nothing extra for a row computed before the table carried form', async () => {
    await renderWithQuery(<StandingsTable rows={[row(1, undefined)]} />);
    const team = screen.getByRole('button');
    expect(within(team).queryAllByText(/^[WLT]$/, { includeHiddenElements: true })).toHaveLength(0);
    expect(team.props.accessibilityLabel).toMatch(/ 6$/);
  });
});
