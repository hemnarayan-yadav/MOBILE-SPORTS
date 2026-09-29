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

  it('adds an account that already exists, found by its number', async () => {
    api = captainApi({
      'post /teams/t1/players/lookup': () =>
        ok({ match: 'user', inSquad: false, user: { id: 'u9', name: 'Suresh', avatarUrl: null } }),
      'post /teams/t1/players/existing': () => ok({ player: { id: 'p3', name: 'Suresh' } }, 201),
    });
    await renderWithQuery(withNotices(<SquadManagement />));

    await fireEvent.press(await screen.findByRole('button', { name: 'Add player' }));
    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9812345610');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Suresh')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Jersey number'), '11');
    await fireEvent.press(screen.getByRole('button', { name: 'Add to squad' }));

    await waitFor(() =>
      expect(api.calls.find((c) => c.url === '/teams/t1/players/existing')?.body).toEqual({
        phone: '+919812345610',
        jerseyNumber: 11,
        playingRole: 'raider',
      }),
    );
  });

  it('invites a number with no account, and the invitation carries no token', async () => {
    api = captainApi({
      'post /teams/t1/players/lookup': () => ok({ match: 'none' }),
      'post /teams/t1/invitations': () =>
        ok({ ...INVITATION, player: { id: 'p4', name: 'Manoj' } }, 201),
    });
    await renderWithQuery(withNotices(<SquadManagement />));

    await fireEvent.press(await screen.findByRole('button', { name: 'Add player' }));
    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9812345611');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    await fireEvent.changeText(await screen.findByLabelText('Full name'), 'Manoj');
    await fireEvent.changeText(screen.getByLabelText('Jersey number'), '12');
    await fireEvent.press(screen.getByRole('button', { name: 'Add and send invitation' }));

    const sent = await waitFor(() => {
      const call = api.calls.find((c) => c.url === '/teams/t1/invitations' && c.method === 'post');
      expect(call).toBeTruthy();
      return call;
    });
    expect(sent.body).toEqual({
      phone: '+919812345611',
      name: 'Manoj',
      jerseyNumber: 12,
      playingRole: 'raider',
    });
    expect(JSON.stringify(sent.body)).not.toContain('token');
  });

  it('translates a jersey number already taken', async () => {
    api = captainApi({
      'post /teams/t1/players/lookup': () => ok({ match: 'none' }),
      'post /teams/t1/invitations': () => fail(409, 'JERSEY_NUMBER_TAKEN'),
    });
    await renderWithQuery(withNotices(<SquadManagement />));

    await fireEvent.press(await screen.findByRole('button', { name: 'Add player' }));
    await fireEvent.changeText(await screen.findByLabelText('Phone number'), '9812345611');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.changeText(await screen.findByLabelText('Full name'), 'Manoj');
    await fireEvent.changeText(screen.getByLabelText('Jersey number'), '1');
    await fireEvent.press(screen.getByRole('button', { name: 'Add and send invitation' }));

    expect(
      await screen.findByText('This jersey number is already taken in the squad'),
    ).toBeTruthy();
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

  it('resends and cancels, and cancelling asks first', async () => {
    api = captainApi({
      'post /teams/t1/invitations/i1/resend': () => ok(INVITATION, 201),
      'delete /teams/t1/invitations/i1': () => ok({ ...INVITATION, status: 'cancelled' }),
    });
    await renderWithQuery(withNotices(<SquadManagement />));

    await fireEvent.press(await screen.findByLabelText('Send the invitation to Ravi Kumar again'));
    await waitFor(() =>
      expect(api.calls.some((c) => c.url === '/teams/t1/invitations/i1/resend')).toBe(true),
    );

    await fireEvent.press(await screen.findByLabelText('Cancel the invitation of Ravi Kumar'));
    expect(api.calls.some((c) => c.method === 'delete')).toBe(false);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancel invitation' }));
    await waitFor(() =>
      expect(
        api.calls.some((c) => c.method === 'delete' && c.url === '/teams/t1/invitations/i1'),
      ).toBe(true),
    );
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
