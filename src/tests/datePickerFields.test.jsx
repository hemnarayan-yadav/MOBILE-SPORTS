import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Matches from '../app/(tabs)/matches.jsx';
import PlayerForm from '../components/player/PlayerForm.jsx';
import '../i18n/index.js';
import { formatDate } from '../utils/format.js';
import { isoYearsAgo, todayISO } from '../utils/dates.js';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
  Link: ({ children }) => children,
}));

let api;

beforeEach(resetSession);
afterEach(() => api?.restore());

const day = (iso) => screen.getByLabelText(formatDate(iso));

describe('a player’s date of birth', () => {
  it('is picked from a calendar, not typed', async () => {
    await renderWithQuery(<PlayerForm mode="profile" onSubmit={jest.fn()} />);

    // It used to be a text box asking for "YYYY-MM-DD"; it is now a button that
    // opens the calendar, and that hint is gone from the app entirely.
    const field = screen.getByLabelText('Date of birth');
    expect(field.props.accessibilityRole).toBe('button');
    expect(screen.queryByPlaceholderText('YYYY-MM-DD')).toBeNull();
    expect(screen.queryByText(/YYYY-MM-DD/)).toBeNull();
  });

  it('cannot offer a date the API would refuse', async () => {
    await renderWithQuery(<PlayerForm mode="profile" onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByLabelText('Date of birth'));
    await waitFor(() => expect(screen.getByLabelText('Choose year')).toBeTruthy());

    // The server accepts an age of 10 to 60 (players.validation.js), so the
    // calendar opens on the youngest allowed birth date and cannot pass it.
    const youngest = isoYearsAgo(10);
    expect(day(youngest).props.accessibilityState.disabled).toBe(false);
    expect(screen.getByLabelText('Next month').props.accessibilityState.disabled).toBe(true);
  });
});

describe('the completed-match date bounds', () => {
  const page = { items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };

  const stub = () => {
    api = fakeApi(({ url }) => {
      if (url === '/tournaments') return ok({ items: [], pagination: page.pagination });
      return ok({ ...page, serverTime: '2026-09-30T10:00:00.000Z' });
    });
  };

  const lastCall = () => api.calls.filter((call) => call.url === '/matches').at(-1);

  const openCompleted = async () => {
    fireEvent.press(screen.getByRole('tab', { name: 'Completed' }));
    await waitFor(() => expect(screen.getByLabelText('From')).toBeTruthy());
  };

  it('offers a real from and to alongside the named ranges', async () => {
    stub();
    await renderWithQuery(<Matches />);
    await openCompleted();

    expect(screen.getByLabelText('Played')).toBeTruthy();
    expect(screen.getByLabelText('From')).toBeTruthy();
    expect(screen.getByLabelText('To')).toBeTruthy();
  });

  it('sends an exact span as it was picked', async () => {
    stub();
    await renderWithQuery(<Matches />);
    await openCompleted();

    fireEvent.press(screen.getByLabelText('From'));
    const first = todayISO().slice(0, 8) + '01';
    fireEvent.press(await screen.findByLabelText(formatDate(first)));

    await waitFor(() => expect(lastCall().params.from).toBe(first));
  });

  it('clears a named range when a bound is picked, so the two cannot disagree', async () => {
    stub();
    await renderWithQuery(<Matches />);
    await openCompleted();

    fireEvent.press(screen.getByLabelText('Played'));
    fireEvent.press(await screen.findByLabelText('Last 7 days'));
    await waitFor(() => expect(lastCall().params.from).toBeTruthy());
    const fromRange = lastCall().params.from;

    fireEvent.press(screen.getByLabelText('From'));
    const first = todayISO().slice(0, 8) + '01';
    fireEvent.press(await screen.findByLabelText(formatDate(first)));

    // The exact date wins and the range is forgotten, rather than both applying.
    await waitFor(() => expect(lastCall().params.from).toBe(first));
    expect(lastCall().params.from).not.toBe(fromRange);
  });

  it('clears an exact span when a named range is picked', async () => {
    stub();
    await renderWithQuery(<Matches />);
    await openCompleted();

    fireEvent.press(screen.getByLabelText('To'));
    const first = todayISO().slice(0, 8) + '01';
    fireEvent.press(await screen.findByLabelText(formatDate(first)));
    await waitFor(() => expect(lastCall().params.to).toBe(first));

    fireEvent.press(screen.getByLabelText('Played'));
    fireEvent.press(await screen.findByLabelText('This year'));

    await waitFor(() => expect(lastCall().params.to).toBe(''));
  });

  it('cannot ask for a completed match played tomorrow', async () => {
    stub();
    await renderWithQuery(<Matches />);
    await openCompleted();

    fireEvent.press(screen.getByLabelText('To'));
    await waitFor(() => expect(screen.getByLabelText('Choose year')).toBeTruthy());

    expect(day(todayISO()).props.accessibilityState.disabled).toBe(false);
    expect(screen.getByLabelText('Next month').props.accessibilityState.disabled).toBe(true);
  });

  it('is cleared with the rest of the filters', async () => {
    stub();
    await renderWithQuery(<Matches />);
    await openCompleted();

    fireEvent.press(screen.getByLabelText('From'));
    const first = todayISO().slice(0, 8) + '01';
    fireEvent.press(await screen.findByLabelText(formatDate(first)));
    await waitFor(() => expect(screen.getByText('Clear filters')).toBeTruthy());

    fireEvent.press(screen.getByText('Clear filters'));

    await waitFor(() => expect(lastCall().params.from).toBe(''));
    expect(lastCall().params.to).toBe('');
  });
});
