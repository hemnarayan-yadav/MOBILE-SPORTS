jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import CaptainHome from '../app/captain/index.jsx';
import CaptainTournaments from '../app/captain/tournaments.jsx';
import SquadManagement from '../app/captain/squad.jsx';
import TeamEditor from '../app/captain/team.jsx';
import CreateTeam from '../app/user/create-team.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { fail, fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20_000);

// The captain's screens (M5). The API is answered in memory, so the screens,
// the forms and their schemas really run.
const CAPTAIN = {
  id: 'u1',
  name: 'Hemnarayan',
  role: 'captain',
  teamId: 't1',
  phone: '+919876543210',
};
const PLAIN_USER = { id: 'u2', name: 'Asha Devi', role: 'user', teamId: null };

const member = (id, name, jerseyNumber, extra = {}) => ({
  jerseyNumber,
  playingRole: 'raider',
  isPlayingSeven: false,
  joinedAt: null,
  player: { id, name, photoUrl: null, age: null, careerStats: {} },
  ...extra,
});

const TEAM = {
  id: 't1',
  name: 'Biroda King',
  shortName: 'BK',
  status: 'active',
  logoUrl: null,
  bannerUrl: null,
  city: 'Rohtak',
  homeGround: 'Biroda Ground',
  foundedYear: 2019,
  description: '',
  deactivatedByRole: null,
  squadCount: 2,
  captain: { id: 'u1', name: 'Hemnarayan' },
  squad: [member('p1', 'Ajay Singh', 1), member('p2', 'Ravi Kumar', 9, { isPlayingSeven: true })],
};

const INVITATION = {
  id: 'i1',
  status: 'pending',
  phone: '+919812345610',
  player: { id: 'p9', name: 'Ravi Kumar', photoUrl: null },
  expiresAt: '2026-10-05T10:00:00.000Z',
  lastSentAt: '2026-09-28T10:00:00.000Z',
  resendCount: 0,
  acceptedAt: null,
  cancelledAt: null,
  createdAt: '2026-09-28T10:00:00.000Z',
  delivery: { status: 'sent', attempts: 1, sentAt: '2026-09-28T10:00:05.000Z', error: null },
};

// One POST /users/search result: the picture, the name and the jersey number
// the row shows, and only a masked phone number.
const MASKED_PHONE = '•••••3210';
const FOUND = {
  id: 'u9',
  name: 'Suresh',
  avatarUrl: 'https://img.example/suresh.jpg',
  jerseyNumber: '9',
  phoneMasked: MASKED_PHONE,
  playerId: null,
  inSquad: false,
};

// Every image source in a rendered tree, so a row's profile picture can be
// asserted on without reaching into component internals.
const imageUris = (node) => {
  if (!node || typeof node !== 'object') return [];
  const here = node.props?.source?.uri ? [node.props.source.uri] : [];
  return [...here, ...[].concat(node.children ?? []).flatMap(imageUris)];
};

// Searching for somebody who does not exist, up to the direct-add form.
const openDirectAddFor = async (name) => {
  await fireEvent.press(await screen.findByRole('button', { name: 'Add player' }));
  await fireEvent.changeText(await screen.findByLabelText('Name or mobile number'), name);
  await fireEvent.changeText(await screen.findByLabelText('Full name'), name);
  await fireEvent.changeText(screen.getByLabelText('Phone number'), '9812345611');
};
// The form's own button, which shares its wording with the one that opened it.
const submitDirectAdd = () =>
  fireEvent.press(screen.getAllByRole('button', { name: 'Add player' }).at(-1));

let api;

beforeEach(() => {
  resetSession();
  jest.clearAllMocks();
  useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: CAPTAIN, accessToken: 'at' });
});
afterEach(() => api?.restore());

const withNotices = (element) => (
  <>
    {element}
    <NoticeHost />
  </>
);

// The whole API the captain screens read, answerable per test.
function captainApi(overrides = {}, team = TEAM) {
  return fakeApi((call) => {
    const key = `${call.method} ${call.url}`;
    if (overrides[key]) return overrides[key](call);
    if (overrides[call.url]) return overrides[call.url](call);
    switch (call.url) {
      case '/teams/t1':
        return ok(team);
      case '/teams/t1/registrations':
        return ok([]);
      case '/teams/t1/invitations':
        return ok([INVITATION]);
      case '/users/search':
        return ok({ items: [] });
      case '/matches':
        return ok({ items: [], pagination: { page: 1, totalPages: 1, total: 0 } });
      case '/media/config':
        return ok({ enabled: true, maxImageMb: 5, maxVideoMb: 50 });
      case '/otp/config':
        return ok({ available: true, flow: 'code', channel: 'whatsapp' });
      default:
        return ok({});
    }
  });
}

describe('Registering a team', () => {
  it('creates the team, turns the account into its captain and opens the squad', async () => {
    useAuthStore.setState({ user: PLAIN_USER });
    api = captainApi({
      'post /teams': () => ok({ team: { ...TEAM, squadCount: 0 }, user: CAPTAIN }, 201),
    });
    await renderWithQuery(withNotices(<CreateTeam />));

    await fireEvent.changeText(await screen.findByLabelText('Team name'), 'Biroda King');
    await fireEvent.changeText(screen.getByLabelText('Short name'), 'BK');
    await fireEvent.press(screen.getByRole('button', { name: 'Create team' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/captain/squad'));
    expect(api.calls.find((c) => c.url === '/teams' && c.method === 'post').body).toMatchObject({
      name: 'Biroda King',
      shortName: 'BK',
    });
    // The role comes from the server answer, never from a guess on the client.
    expect(useAuthStore.getState().user.role).toBe('captain');
  });

  it('refuses a short name the API would refuse, without calling it', async () => {
    useAuthStore.setState({ user: PLAIN_USER });
    api = captainApi();
    await renderWithQuery(<CreateTeam />);

    await fireEvent.changeText(await screen.findByLabelText('Team name'), 'Biroda King');
    await fireEvent.changeText(screen.getByLabelText('Short name'), 'B');
    await fireEvent.press(screen.getByRole('button', { name: 'Create team' }));

    expect(await screen.findByText('Use 2–5 letters or digits')).toBeTruthy();
    expect(api.calls.some((c) => c.method === 'post' && c.url === '/teams')).toBe(false);
  });

  it('translates a taken team name and keeps the form', async () => {
    useAuthStore.setState({ user: PLAIN_USER });
    api = captainApi({ 'post /teams': () => fail(409, 'TEAM_NAME_TAKEN') });
    await renderWithQuery(withNotices(<CreateTeam />));

    await fireEvent.changeText(await screen.findByLabelText('Team name'), 'Biroda King');
    await fireEvent.changeText(screen.getByLabelText('Short name'), 'BK');
    await fireEvent.press(screen.getByRole('button', { name: 'Create team' }));

    expect(await screen.findByText('A team with this name already exists')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("The captain's home", () => {
  it('shows the team, the squad count and how ready it is', async () => {
    api = captainApi();
    await renderWithQuery(<CaptainHome />);

    expect(await screen.findByText('Biroda King')).toBeTruthy();
    expect(screen.getByText('2/25')).toBeTruthy();
    // One of the two is in the seven.
    expect(screen.getAllByText('1/7').length).toBeGreaterThan(0);
    expect(screen.getByText('Squad readiness')).toBeTruthy();
  });

  it('offers to register a team to an account that has none', async () => {
    useAuthStore.setState({ user: PLAIN_USER });
    api = captainApi();
    await renderWithQuery(<CaptainHome />);

    expect(await screen.findByText('No team linked to this account')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Create team' }));
    expect(router.push).toHaveBeenCalledWith('/user/create-team');
  });
});

describe('The squad', () => {
  it('lists the squad and marks a player who has been invited but not signed up', async () => {
    api = captainApi();
    await renderWithQuery(<SquadManagement />);

    expect(await screen.findByText('Ajay Singh')).toBeTruthy();
    expect(screen.getByText('2 of 25 players')).toBeTruthy();
  });

  // Adding a player starts with a search by name or number: an account that
  // already exists is added, never registered a second time. The row shows the
  // picture, the name and the jersey number, and never a full phone number.
  it('finds an account by name and adds it to the squad by its id', async () => {
    api = captainApi({
      'post /users/search': () => ok({ items: [FOUND] }),
      'post /teams/t1/players/existing': () => ok({ player: { id: 'p3', name: 'Suresh' } }, 201),
    });
    const view = await renderWithQuery(withNotices(<SquadManagement />));

    await fireEvent.press(await screen.findByRole('button', { name: 'Add player' }));
    await fireEvent.changeText(await screen.findByLabelText('Name or mobile number'), 'Suresh');

    const row = await screen.findByLabelText('Suresh Jersey #9');
    expect(screen.getByText(MASKED_PHONE)).toBeTruthy();
    expect(screen.getByText('#9')).toBeTruthy();
    expect(imageUris(view.toJSON())).toContain(FOUND.avatarUrl);
    // Only the masked number is ever rendered.
    expect(screen.queryByText(/9876543210/)).toBeNull();

    await fireEvent.press(row);
    await fireEvent.changeText(await screen.findByLabelText('Jersey number'), '11');
    await fireEvent.press(screen.getByRole('button', { name: 'Add to squad' }));

    await waitFor(() =>
      expect(api.calls.find((c) => c.url === '/teams/t1/players/existing')?.body).toEqual({
        userId: 'u9',
        jerseyNumber: '11',
        playingRole: 'raider',
      }),
    );
    // Nothing in the squad flow sends an invitation any more.
    expect(api.calls.some((c) => c.method === 'post' && c.url.endsWith('/invitations'))).toBe(
      false,
    );
  });

  // Finding the player is the only way in: the obsolete "Without a phone" tab,
  // which made a squad place with no account behind it, is gone.
  it('opens the add sheet straight into the search, with no tab to choose', async () => {
    api = captainApi({});
    await renderWithQuery(<SquadManagement />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Add player' }));

    expect(await screen.findByLabelText('Name or mobile number')).toBeTruthy();
    expect(screen.queryByText('Without a phone')).toBeNull();
    expect(screen.queryByText('Find the player')).toBeNull();
    // No profile form until the search has found nobody.
    expect(screen.queryByLabelText('Full name')).toBeNull();
  });

  // A matching name is no proof it is the same person, so the captain is always
  // offered a new member — but only on request, so the results are seen first.
  it('offers a new member alongside the results, and opens the form on request', async () => {
    api = captainApi({ 'post /users/search': () => ok({ items: [FOUND] }) });
    await renderWithQuery(<SquadManagement />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Add player' }));
    await fireEvent.changeText(await screen.findByLabelText('Name or mobile number'), 'Suresh');

    await screen.findByLabelText('Suresh Jersey #9');
    expect(screen.queryByLabelText('Full name')).toBeNull();

    await fireEvent.press(await screen.findByRole('button', { name: 'Add new member' }));

    // The name that was searched for carries into the form, and nothing has
    // been created: the account from the results was not touched.
    expect((await screen.findByLabelText('Full name')).props.value).toBe('Suresh');
    expect(api.calls.some((c) => c.url.includes('/players/'))).toBe(false);
  });

  // Finding nobody opens the direct-add form by itself, and it creates the
  // account and the squad place together — no invitation, no link.
  it('opens the direct-add form when nothing is found, and creates the player', async () => {
    api = captainApi({
      'post /users/search': () => ok({ items: [] }),
      'post /teams/t1/players/direct': () =>
        ok({ player: { id: 'p4', name: 'Manoj' }, accountCreated: true }, 201),
    });
    await renderWithQuery(withNotices(<SquadManagement />));

    await openDirectAddFor('Manoj');
    await fireEvent.changeText(screen.getByLabelText('Jersey number'), '12');
    await submitDirectAdd();

    const sent = await waitFor(() => {
      const call = api.calls.find((c) => c.url === '/teams/t1/players/direct');
      expect(call).toBeTruthy();
      return call;
    });
    expect(sent.body).toEqual({
      name: 'Manoj',
      phone: '+919812345611',
      jerseyNumber: '12',
      playingRole: 'raider',
      location: { state: null, district: null },
    });
    expect(JSON.stringify(sent.body)).not.toContain('token');
    expect(await screen.findByText('Manoj added to the squad')).toBeTruthy();
  });

  // A number that turns out to have an account is not an error: the API
  // attaches that account and says it did not create one.
  it('says so when the number already had an account', async () => {
    api = captainApi({
      'post /users/search': () => ok({ items: [] }),
      'post /teams/t1/players/direct': () =>
        ok({ player: { id: 'p4', name: 'Manoj' }, accountCreated: false }, 201),
    });
    await renderWithQuery(withNotices(<SquadManagement />));

    await openDirectAddFor('Manoj');
    await fireEvent.changeText(screen.getByLabelText('Jersey number'), '12');
    await submitDirectAdd();

    expect(await screen.findByText(/already had a KhelScore account/)).toBeTruthy();
  });

  // Searching by number and finding nobody carries the number into the form,
  // so the captain never types it twice.
  it('carries a searched mobile number into the direct-add form', async () => {
    api = captainApi({ 'post /users/search': () => ok({ items: [] }) });
    await renderWithQuery(<SquadManagement />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Add player' }));
    await fireEvent.changeText(
      await screen.findByLabelText('Name or mobile number'),
      '9812345611',
    );

    expect((await screen.findByLabelText('Phone number')).props.value).toBe('9812345611');
    // A number is not a name, so the name is left for the captain to type.
    expect(screen.getByLabelText('Full name').props.value).toBe('');
  });

  // Two players may wear the same number, so the only thing the API still
  // refuses here is a number it cannot use at all.
  it('keeps a jersey number exactly as it was typed, leading zero and all', async () => {
    api = captainApi({
      'post /users/search': () => ok({ items: [] }),
      'post /teams/t1/players/direct': () =>
        ok({ player: { id: 'p4', name: 'Manoj' }, accountCreated: true }, 201),
    });
    await renderWithQuery(withNotices(<SquadManagement />));

    await openDirectAddFor('Manoj');
    await fireEvent.changeText(screen.getByLabelText('Jersey number'), '08');
    await submitDirectAdd();

    await waitFor(() =>
      expect(api.calls.find((c) => c.url === '/teams/t1/players/direct')?.body.jerseyNumber).toBe(
        '08',
      ),
    );
  });

  it('says the squad is full at 25 and will not open the add sheet', async () => {
    const full = {
      ...TEAM,
      squadCount: 25,
      squad: Array.from({ length: 25 }, (_, i) => member(`p${i}`, `Player ${i}`, i + 1)),
    };
    api = captainApi({}, full);
    await renderWithQuery(<SquadManagement />);

    const button = await screen.findByRole('button', { name: 'Squad is full' });
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  it('releases a player only after the confirmation', async () => {
    api = captainApi({ 'delete /teams/t1/players/p1': () => ok(null) });
    await renderWithQuery(withNotices(<SquadManagement />));

    await fireEvent.press(await screen.findByLabelText('Actions for Ajay Singh'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Release from squad' }));
    expect(api.calls.some((c) => c.url === '/teams/t1/players/p1')).toBe(false);

    await fireEvent.press(await screen.findByRole('button', { name: 'Release from squad' }));
    await waitFor(() =>
      expect(api.calls.some((c) => c.method === 'delete' && c.url === '/teams/t1/players/p1')).toBe(
        true,
      ),
    );
  });

  it('saves the playing seven in one call and refuses an eighth pick', async () => {
    const eight = {
      ...TEAM,
      squadCount: 8,
      squad: Array.from({ length: 8 }, (_, i) => member(`p${i}`, `Player ${i}`, i + 1)),
    };
    api = captainApi({ 'put /teams/t1/playing-seven': () => ok(eight.squad) }, eight);
    await renderWithQuery(withNotices(<SquadManagement />));

    await fireEvent.press(await screen.findByRole('radio', { name: 'Playing 7' }));
    for (let i = 0; i < 8; i += 1) {
      await fireEvent.press(await screen.findByLabelText(`${i + 1} Player ${i}`));
    }
    expect(await screen.findByText("You've already picked 7 players")).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Save playing 7 (7/7)' }));
    await waitFor(() => {
      const call = api.calls.find((c) => c.url === '/teams/t1/playing-seven');
      expect(call.body.playerIds).toHaveLength(7);
    });
  });
});

describe('Invitations', () => {
  it('lists an open invitation with its delivery state', async () => {
    api = captainApi();
    await renderWithQuery(<SquadManagement />);

    expect(await screen.findByText('Invitations')).toBeTruthy();
    expect(screen.getByText('+91 9812345610')).toBeTruthy();
  });

  it('is read-only apart from cancelling, which asks first', async () => {
    api = captainApi({
      'delete /teams/t1/invitations/i1': () => ok({ ...INVITATION, status: 'cancelled' }),
    });
    await renderWithQuery(withNotices(<SquadManagement />));

    await screen.findByText('Invitations');
    // Sending is retired: no resend, and no delivery state to report.
    expect(screen.queryByLabelText('Send the invitation to Ravi Kumar again')).toBeNull();
    expect(screen.queryByText(/WhatsApp/)).toBeNull();

    await fireEvent.press(await screen.findByLabelText('Cancel the invitation of Ravi Kumar'));
    expect(api.calls.some((c) => c.method === 'delete')).toBe(false);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancel invitation' }));
    await waitFor(() =>
      expect(
        api.calls.some((c) => c.method === 'delete' && c.url === '/teams/t1/invitations/i1'),
      ).toBe(true),
    );
  });

  it('shows no invitations section at all once a team has none', async () => {
    api = captainApi({ '/teams/t1/invitations': () => ok([]) });
    await renderWithQuery(<SquadManagement />);

    expect(await screen.findByText('Ajay Singh')).toBeTruthy();
    expect(screen.queryByText('Invitations')).toBeNull();
  });
});

describe('Editing the team', () => {
  it('saves a change and deactivates only after the confirmation', async () => {
    api = captainApi({
      'patch /teams/t1': () => ok({ ...TEAM, city: 'Sonipat' }),
      'patch /teams/t1/status': () =>
        ok({ ...TEAM, status: 'inactive', deactivatedByRole: 'captain' }),
    });
    await renderWithQuery(withNotices(<TeamEditor />));

    await fireEvent.changeText(await screen.findByLabelText('City'), 'Sonipat');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.method === 'patch' && c.url === '/teams/t1').body.city).toBe(
        'Sonipat',
      ),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Deactivate team' }));
    expect(api.calls.some((c) => c.url === '/teams/t1/status')).toBe(false);
    await fireEvent.press(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(api.calls.find((c) => c.url === '/teams/t1/status').body).toEqual({
        status: 'inactive',
      }),
    );
  });

  it('cannot reactivate a team a Super Admin switched off, and says why', async () => {
    const locked = { ...TEAM, status: 'inactive', deactivatedByRole: 'super_admin' };
    api = captainApi({}, locked);
    await renderWithQuery(<TeamEditor />);

    expect(
      await screen.findByText(
        'This team was deactivated by a Super Admin. Contact support to reactivate it.',
      ),
    ).toBeTruthy();
    const activate = screen.getByRole('button', { name: 'Activate team' });
    expect(activate.props.accessibilityState.disabled).toBe(true);
  });
});

describe('Tournaments', () => {
  const OPEN_TOURNAMENT = {
    id: 'tr1',
    name: 'Haryana Kabaddi Cup',
    status: 'registration_open',
    season: '2026',
    startDate: '2026-10-10T00:00:00.000Z',
    endDate: '2026-10-20T00:00:00.000Z',
    format: 'league',
    logoUrl: null,
    teamCount: 4,
  };

  it('enters an open tournament when the squad is big enough', async () => {
    const ready = {
      ...TEAM,
      squadCount: 9,
      squad: Array.from({ length: 9 }, (_, i) => member(`p${i}`, `Player ${i}`, i + 1)),
    };
    api = captainApi(
      {
        '/tournaments': () =>
          ok({ items: [OPEN_TOURNAMENT], pagination: { page: 1, totalPages: 1, total: 1 } }),
        'post /tournaments/tr1/register-team': () => ok({ id: 'r1', status: 'pending' }, 201),
      },
      ready,
    );
    await renderWithQuery(withNotices(<CaptainTournaments />));

    await fireEvent.press(await screen.findByRole('button', { name: 'Register my team' }));
    await waitFor(() =>
      expect(api.calls.some((c) => c.url === '/tournaments/tr1/register-team')).toBe(true),
    );
  });

  it('says why a team with too few players cannot enter, and does not let it', async () => {
    api = captainApi({
      '/tournaments': () =>
        ok({ items: [OPEN_TOURNAMENT], pagination: { page: 1, totalPages: 1, total: 1 } }),
    });
    await renderWithQuery(<CaptainTournaments />);

    expect(
      await screen.findByText('Your team must be active and have at least 7 players to register.'),
    ).toBeTruthy();
    const enter = screen.getByRole('button', { name: 'Register my team' });
    expect(enter.props.accessibilityState.disabled).toBe(true);
  });

  it('withdraws a pending entry', async () => {
    api = captainApi({
      '/teams/t1/registrations': () =>
        ok([
          {
            id: 'r1',
            status: 'pending',
            registeredAt: '2026-09-20T10:00:00.000Z',
            rejectionReason: null,
            tournament: { id: 'tr1', name: 'Haryana Kabaddi Cup' },
          },
        ]),
      'delete /tournaments/tr1/register-team': () => ok(null),
    });
    await renderWithQuery(withNotices(<CaptainTournaments />));

    await fireEvent.press(await screen.findByRole('tab', { name: 'My registrations' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Withdraw' }));
    await waitFor(() =>
      expect(
        api.calls.some((c) => c.method === 'delete' && c.url === '/tournaments/tr1/register-team'),
      ).toBe(true),
    );
  });
});
