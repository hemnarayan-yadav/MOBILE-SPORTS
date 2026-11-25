import { configure, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import PlayerScreen from '../app/player/[id].jsx';
import { fakeApi, ok, renderWithQuery } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20_000);

// A player's profile header wears the colour read from their photo, as a
// team's page does (the API's `accentColor`).
const PLAYER = {
  id: 'p4',
  name: 'Sanskar Mishra',
  currentTeam: null,
  membership: { jerseyNumber: 11, playingRole: 'raider' },
  careerStats: { matches: 3, totalPoints: 27, raidPoints: 27, tacklePoints: 0 },
  age: null,
  history: [],
  accentColor: null,
};

let api;

afterEach(() => api?.restore());

async function renderPlayer(extra) {
  useLocalSearchParams.mockReturnValue({ id: 'p4' });
  api = fakeApi(({ url }) =>
    url === '/players/p4' ? ok({ ...PLAYER, ...extra }) : ok({ rates: {}, recentMatches: [] }),
  );
  const view = await renderWithQuery(<PlayerScreen />);
  await screen.findByText('Sanskar Mishra');
  return view;
}

// The first node of the tree that has the given background.
const hasBackground = (node, colour) =>
  Boolean(node) &&
  typeof node === 'object' &&
  (StyleSheet.flatten(node.props?.style)?.backgroundColor === colour ||
    (node.children ?? []).some((child) => hasBackground(child, colour)));

describe('the career tiles', () => {
  it('count Super 10s and High 5s', async () => {
    await renderPlayer({ careerStats: { ...PLAYER.careerStats, super10s: 2, high5s: 1 } });
    expect(screen.getByText('Super 10s')).toBeTruthy();
    expect(screen.getByText('High 5s')).toBeTruthy();
  });
});

describe('the player header colour', () => {
  it('fills the header with the colour of the photo', async () => {
    const { toJSON } = await renderPlayer({ accentColor: '#1a6be0' });
    expect(hasBackground(toJSON(), '#1a6be0')).toBe(true);
  });

  it('keeps the ink header for a player with no colour, and ignores a value that is not one', async () => {
    const none = await renderPlayer({ accentColor: null });
    expect(hasBackground(none.toJSON(), '#1a6be0')).toBe(false);
    none.unmount();

    const bad = await renderPlayer({ accentColor: 'url(x)' });
    expect(hasBackground(bad.toJSON(), 'url(x)')).toBe(false);
    bad.unmount();
  });
});
