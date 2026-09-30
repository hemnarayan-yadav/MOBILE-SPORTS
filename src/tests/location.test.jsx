import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import StateDistrictFields from '../components/common/StateDistrictFields.jsx';
import { LeaderboardList } from '../components/tournament/TournamentBits.jsx';
import Players from '../app/players.jsx';
import Teams from '../app/teams.jsx';
import { INDIA_STATES, districtsOf, locationLabel, stateName } from '../utils/india.js';
import { teamSchema, toLocationPayload, toLocationValues } from '../utils/validation.js';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
  Link: ({ children }) => children,
}));

// A controlled wrapper, the way every real caller uses the component.
function Fields({ variant = 'form', onChange }) {
  const [value, setValue] = useState({ state: '', district: '' });
  return (
    <StateDistrictFields
      variant={variant}
      state={value.state}
      district={value.district}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const emptyPage = { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };

// Opens a picker sheet and taps one of its options. The list is a FlatList, so
// an option far down it is not rendered until the sheet's own search narrows
// the list — which is how a phone reaches "Maharashtra" or "Rohtak" too.
// Every render goes through renderWithQuery: that is the call `screen` binds to.
async function pick(label, option) {
  fireEvent.press(screen.getByLabelText(label));
  const search = await screen.findByLabelText('Search');
  fireEvent.changeText(search, option);
  fireEvent.press(await screen.findByLabelText(option));
  // The sheet closes and the choice lands on the next render.
  await waitFor(() => expect(screen.queryByLabelText('Search')).toBeNull());
}

beforeEach(resetSession);

describe('the state and district pickers', () => {
  it('offers every state, and keeps the district closed until one is chosen', async () => {
    await renderWithQuery(<Fields />);

    expect(screen.getByLabelText('State')).toBeTruthy();
    expect(screen.getByLabelText('District').props.accessibilityState.disabled).toBe(true);
    expect(INDIA_STATES).toHaveLength(36);
  });

  it('offers the districts of the chosen state', async () => {
    await renderWithQuery(<Fields />);

    await pick('State', 'Haryana');

    expect(screen.getByLabelText('District').props.accessibilityState.disabled).toBe(false);
    expect(districtsOf('HR')).toContain('Rohtak');

    await pick('District', 'Rohtak');

    expect(screen.getByLabelText('District').props.accessibilityValue.text).toBe('Rohtak');
  });

  it('clears a chosen district when the state changes, so the pair never disagrees', async () => {
    const onChange = jest.fn();
    await renderWithQuery(<Fields onChange={onChange} />);

    await pick('State', 'Haryana');
    await pick('District', 'Rohtak');
    expect(onChange).toHaveBeenLastCalledWith({ state: 'HR', district: 'Rohtak' });

    await pick('State', 'Maharashtra');

    expect(onChange).toHaveBeenLastCalledWith({ state: 'MH', district: '' });
  });
});

describe('the location filters', () => {
  it('asks the player list for the chosen state', async () => {
    const api = fakeApi(() => ok(emptyPage));
    try {
      await renderWithQuery(<Players />);
      await waitFor(() => expect(api.calls.some((c) => c.url === '/players')).toBe(true));

      await pick('State', 'Haryana');

      await waitFor(() => {
        const last = api.calls.filter((c) => c.url === '/players').at(-1);
        expect(last.params).toMatchObject({ state: 'HR', district: '' });
      });
    } finally {
      api.restore();
    }
  });

  it('asks the team list the same way', async () => {
    const api = fakeApi(() => ok(emptyPage));
    try {
      await renderWithQuery(<Teams />);
      await waitFor(() => expect(api.calls.some((c) => c.url === '/teams')).toBe(true));

      await pick('State', 'Maharashtra');

      await waitFor(() => {
        const last = api.calls.filter((c) => c.url === '/teams').at(-1);
        expect(last.params).toMatchObject({ state: 'MH' });
      });
    } finally {
      api.restore();
    }
  });

  it('labels the empty option "all" rather than "select"', async () => {
    await renderWithQuery(<Fields variant="filter" />);
    expect(screen.getByLabelText('State').props.accessibilityValue.text).toBe('All states');
  });
});

describe('a ranking row', () => {
  const entry = (location) => ({
    rank: 1,
    player: { id: 'p1', name: 'Pardeep Narwal', photoUrl: null, location },
    team: { id: 't1', name: 'Rohtak Raiders', shortName: 'RKR', logoUrl: null, status: 'active' },
    score: 42,
    matches: 6,
    metrics: { raidSuccessRate: 0.5, tackleSuccessRate: 0.4 },
  });

  it('shows the player’s city next to their team', async () => {
    await renderWithQuery(
      <LeaderboardList
        entries={[entry({ state: 'HR', district: 'Rohtak' })]}
        category="best_raider"
      />,
    );
    expect(screen.getByText(/Rohtak Raiders · Rohtak/)).toBeTruthy();
  });

  it('says nothing when the profile has no location', async () => {
    await renderWithQuery(
      <LeaderboardList entries={[entry({ state: null, district: null })]} category="best_raider" />,
    );
    expect(screen.queryByText(/· Haryana/)).toBeNull();
  });
});

describe('the location helpers', () => {
  it('maps between the form’s flat fields and the API’s nested pair', () => {
    expect(toLocationPayload({ state: '', district: '' })).toEqual({ state: null, district: null });
    expect(toLocationPayload({ state: 'HR', district: 'Rohtak' })).toEqual({
      state: 'HR',
      district: 'Rohtak',
    });
    expect(toLocationValues(null)).toEqual({ state: '', district: '' });
  });

  it('labels a pair by its district, then its state', () => {
    expect(locationLabel({ state: 'HR', district: 'Rohtak' })).toBe('Rohtak');
    expect(locationLabel({ state: 'HR', district: null })).toBe('Haryana');
    expect(locationLabel({})).toBe(null);
    expect(stateName('HR')).toBe('Haryana');
  });

  it('accepts a form with no location and refuses a pair that disagrees', () => {
    const team = {
      name: 'Rohtak Raiders',
      shortName: 'RKR',
      city: '',
      homeGround: '',
      foundedYear: '',
      description: '',
      logoUrl: '',
      bannerUrl: '',
    };
    expect(teamSchema.safeParse(team).success).toBe(true);
    expect(teamSchema.safeParse({ ...team, state: 'HR', district: 'Rohtak' }).success).toBe(true);
    expect(teamSchema.safeParse({ ...team, state: 'HR', district: 'Pune' }).success).toBe(false);
    expect(teamSchema.safeParse({ ...team, state: '', district: 'Pune' }).success).toBe(false);
  });
});
