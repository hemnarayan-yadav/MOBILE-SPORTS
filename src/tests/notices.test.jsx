// Tournaments other people are running, and Kabaddi news from elsewhere.
// Anyone signed in may announce one, so nothing is published on submission and
// anyone signed in may report one — the two halves Play expects together.
jest.mock('../api/notices.api.js', () => ({
  noticesApi: { list: jest.fn(), get: jest.fn(), submit: jest.fn(), report: jest.fn() },
}));
jest.mock('../api/newsFeed.api.js', () => ({
  newsFeedApi: { list: jest.fn() },
}));

const mockOpenBrowser = jest.fn().mockResolvedValue({ type: 'opened' });
jest.mock('expo-web-browser', () => ({ openBrowserAsync: (...args) => mockOpenBrowser(...args) }));

jest.mock('expo-router', () => {
  const actual = jest.requireActual('expo-router');
  return { ...actual, useLocalSearchParams: () => ({ id: 'n1' }) };
});

import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { newsFeedApi } from '../api/newsFeed.api.js';
import { noticesApi } from '../api/notices.api.js';
import NoticeDetail from '../app/notice/[id].jsx';
import AutoCarousel from '../components/notice/AutoCarousel.jsx';
import { NoticeCard } from '../components/notice/NoticeBits.jsx';
import Notices from '../app/notices.jsx';
import i18n from '../i18n/index.js';
import { createQueryClient } from '../lib/queryClient.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';

// The poster this was designed from: one-day night tournament, four prizes,
// a village ground, all in Hindi.
const NOTICE = {
  id: 'n1',
  title: 'एक दिवसीय रात्रिकालीन कबड्डी प्रतियोगिता',
  posterUrl: null,
  description: null,
  startDate: '2026-10-31T00:00:00.000Z',
  endDate: null,
  startTime: '20:30',
  phase: 'upcoming',
  venue: 'ग्राम ठठिया (दारगाँव)',
  location: { state: 'CG', district: 'Durg' },
  prizes: [
    { position: 1, prize: '₹7000' },
    { position: 2, prize: '₹5000' },
  ],
  entryFee: '₹300',
  rules: 'एक गांव एक क्लब',
  organiserName: 'ग्राम समिति',
  contactPhone: '+919876543210',
};

const NEWS = {
  id: 'f1',
  title: 'जिले की जूनियर कबड्डी टीम राज्य स्तरीय प्रतियोगिता के लिए रवाना',
  url: 'https://news.google.com/rss/articles/abc',
  source: 'Dainik Bhaskar',
  publishedAt: '2026-10-20T06:00:00.000Z',
  region: 'chhattisgarh',
  language: 'hi',
};

const page = (items) => ({ items, pagination: { page: 1, limit: 12, total: items.length, totalPages: 1 } });

async function renderScreen(ui) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(async () => {
  noticesApi.list.mockReset();
  noticesApi.get.mockReset();
  noticesApi.report.mockReset();
  newsFeedApi.list.mockReset();
  mockOpenBrowser.mockClear();
  noticesApi.list.mockResolvedValue(page([NOTICE]));
  noticesApi.get.mockResolvedValue(NOTICE);
  noticesApi.report.mockResolvedValue(null);
  newsFeedApi.list.mockResolvedValue(page([NEWS]));
  useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS, user: null });
  await act(() => i18n.changeLanguage('en'));
});

describe('the tournaments and news screen', () => {
  it('opens on upcoming tournaments', async () => {
    await renderScreen(<Notices />);

    expect(await screen.findByText(NOTICE.title)).toBeTruthy();
    expect(noticesApi.list).toHaveBeenCalledWith(expect.objectContaining({ phase: 'upcoming' }));
  });

  it('switches to news and does not ask for tournaments again', async () => {
    await renderScreen(<Notices />);
    await screen.findByText(NOTICE.title);
    const before = noticesApi.list.mock.calls.length;

    fireEvent.press(screen.getByText('News'));

    expect(await screen.findByText(NEWS.title)).toBeTruthy();
    // Each tab owns its query; switching must not refetch the other.
    expect(noticesApi.list.mock.calls.length).toBe(before);
  });

  it('filters by phase', async () => {
    await renderScreen(<Notices />);
    await screen.findByText(NOTICE.title);

    fireEvent.press(screen.getByText('Finished'));

    await waitFor(() =>
      expect(noticesApi.list).toHaveBeenCalledWith(expect.objectContaining({ phase: 'completed' })),
    );
  });

  it('offers to announce a tournament only to someone signed in', async () => {
    await renderScreen(<Notices />);
    await screen.findByText(NOTICE.title);
    expect(screen.queryByText('Announce a tournament')).toBeNull();

    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: { id: 'u1' } });
    await renderScreen(<Notices />);
    expect(await screen.findAllByText('Announce a tournament')).not.toHaveLength(0);
  });
});

describe('a news card', () => {
  it('credits the publisher and opens their page rather than copying it', async () => {
    await renderScreen(<Notices />);
    fireEvent.press(screen.getByText('News'));
    const headline = await screen.findByText(NEWS.title);

    // Only the headline is ours to show; the story stays at the publisher.
    expect(screen.getByText('Read on Dainik Bhaskar')).toBeTruthy();

    fireEvent.press(headline);
    await waitFor(() => expect(mockOpenBrowser).toHaveBeenCalledWith(NEWS.url, expect.any(Object)));
  });
});

describe('one tournament in full', () => {
  it('shows what a reader needs to turn up: when, where, cost and prizes', async () => {
    await renderScreen(<NoticeDetail />);

    expect(await screen.findByText('ग्राम ठठिया (दारगाँव), Durg')).toBeTruthy();
    expect(screen.getByText('₹300')).toBeTruthy();
    expect(screen.getByText('₹7000')).toBeTruthy();
    expect(screen.getByText('एक गांव एक क्लब')).toBeTruthy();
  });

  it('offers reporting to a signed-in reader and nobody else', async () => {
    await renderScreen(<NoticeDetail />);
    await screen.findByText('₹300');
    expect(screen.queryByRole('button', { name: 'Report' })).toBeNull();

    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: { id: 'u1' } });
    await renderScreen(<NoticeDetail />);
    expect(await screen.findByRole('button', { name: 'Report' })).toBeTruthy();
  });

  it('sends a report with the reason chosen', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED, user: { id: 'u1' } });
    await renderScreen(<NoticeDetail />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Report' }));
    expect(await screen.findByText('Report this tournament')).toBeTruthy();
    // Two buttons share the name once the sheet is open — the screen's and the
    // sheet's — and the last one is the sheet's.
    await fireEvent.press(screen.getAllByRole('button', { name: 'Report' }).at(-1));

    await waitFor(() =>
      expect(noticesApi.report).toHaveBeenCalledWith('n1', expect.objectContaining({ reason: 'not_real' })),
    );
  });
});

// Home gives this section a fixed height, so it shows two cards and moves on
// by itself. Auto-advancing content is easy to get wrong, so what it must not
// do is pinned alongside what it does.
describe('the Home carousel', () => {
  const PAGES = [
    { id: 'a', title: 'पहला', startDate: '2026-11-01T00:00:00.000Z', prizes: [] },
    { id: 'b', title: 'दूसरा', startDate: '2026-11-02T00:00:00.000Z', prizes: [] },
    { id: 'c', title: 'तीसरा', startDate: '2026-11-03T00:00:00.000Z', prizes: [] },
  ];

  it('shows two at a time and offers a dot per page', async () => {
    await renderScreen(
      <AutoCarousel
        items={PAGES}
        perPage={2}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <NoticeCard notice={item} />}
      />,
    );

    expect(await screen.findByText('पहला')).toBeTruthy();
    expect(screen.getByText('दूसरा')).toBeTruthy();
    // Three items, two per page: the third is on page two, not on screen.
    expect(screen.queryByText('तीसरा')).toBeNull();
    expect(screen.getAllByLabelText(/\d \/ 2/)).toHaveLength(2);
  });

  it('moves when a dot is pressed, so the timer is never the only way through', async () => {
    await renderScreen(
      <AutoCarousel
        items={PAGES}
        perPage={2}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <NoticeCard notice={item} />}
      />,
    );
    await screen.findByText('पहला');

    await fireEvent.press(screen.getByLabelText('2 / 2'));

    expect(await screen.findByText('तीसरा')).toBeTruthy();
    expect(screen.queryByText('पहला')).toBeNull();
  });
});
