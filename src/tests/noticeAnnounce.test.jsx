// Announcing a tournament from the app: the same form as the website's, and
// the same poster reading. The poster is usually the whole announcement, so
// reading it is the point — it fills the form and leaves the organiser to check
// and send it.
// A whole form screen rendered per test, with a reading and a submit in most:
// slower than the 5 s default on a cold or busy run, like the other screen
// suites here.
jest.setTimeout(20_000);

jest.mock('../api/notices.api.js', () => ({
  noticesApi: { config: jest.fn(), submit: jest.fn(), extractPoster: jest.fn() },
}));

// The upload itself (picker, media API) is ImageField's own business and has
// its own tests; here it only has to hand the form an uploaded asset.
const mockAsset = {
  id: '6ab399eb995024308e988299',
  url: 'https://cdn.test/poster.jpg',
  optimized: null,
};
jest.mock('../components/common/ImageField.jsx', () => {
  const { Pressable, Text } = require('react-native');
  return function MockImageField({ label, onChange, onUploaded }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Upload ${label}`}
        onPress={() => {
          onChange(mockAsset.url);
          onUploaded?.(mockAsset);
        }}
      >
        <Text>{label}</Text>
      </Pressable>
    );
  };
});

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
  Link: ({ children }) => children,
}));

import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { noticesApi } from '../api/notices.api.js';
import AnnounceTournament from '../app/notice/new.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import i18n from '../i18n/index.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { renderWithQuery, resetSession } from './helpers.jsx';

const READING = {
  draft: {
    title: 'दो दिवसीय ग्रामीण स्तरीय कबड्डी प्रतियोगिता',
    description: null,
    startDate: '2026-12-05',
    endDate: '2026-12-06',
    startTime: null,
    venue: 'ग्राम एरमसाही',
    state: 'CG',
    district: 'Bilaspur',
    entryFee: '₹300',
    rules: null,
    organiserName: 'समस्त ग्रामवासी एरमसाही',
    prizes: [
      { position: 1, prize: '₹15000 एवं ट्रॉफी' },
      { position: 2, prize: '₹10000 एवं ट्रॉफी' },
    ],
    awards: [{ title: 'बेस्ट रेडर', prize: '₹1000' }],
    contacts: [
      { name: 'विजेंद्र पटेल', phone: '7999010354' },
      { name: null, phone: '7987476601' },
    ],
  },
  confidence: { startDate: 'low' },
  warnings: [{ field: 'startDate', code: 'POSTER_DATE_AMBIGUOUS' }],
};

const renderForm = () =>
  renderWithQuery(
    <>
      <AnnounceTournament />
      <NoticeHost />
    </>,
  );

// Upload a poster, then press the button that reads it.
async function readPoster() {
  fireEvent.press(screen.getByLabelText('Upload Poster'));
  fireEvent.press(await screen.findByRole('button', { name: 'Fill from poster' }));
}

// The screen's title says the same, so the button is found by its role.
const announce = async () =>
  fireEvent.press(await screen.findByRole('button', { name: 'Announce a tournament' }));

beforeEach(async () => {
  resetSession();
  mockBack.mockClear();
  mockPush.mockClear();
  Object.values(noticesApi).forEach((fn) => fn.mockReset());
  // A server with a poster reader behind it; staging's case has its own test.
  noticesApi.config.mockResolvedValue({ posterReader: true });
  noticesApi.submit.mockResolvedValue({ id: 'n1' });
  useAuthStore.setState({
    status: AUTH_STATUS.AUTHENTICATED,
    user: { id: 'u1', name: 'Ravi', role: 'user' },
    accessToken: 'token',
  });
  await act(() => i18n.changeLanguage('en'));
});

describe('filling the form from the poster', () => {
  it('reads the poster by asset id and fills every row the poster has', async () => {
    noticesApi.extractPoster.mockResolvedValue(READING);
    await renderForm();

    await readPoster();

    await waitFor(() => expect(noticesApi.extractPoster).toHaveBeenCalledWith(mockAsset.id));
    await waitFor(() =>
      expect(screen.getByLabelText('Tournament name').props.value).toBe(READING.draft.title),
    );
    expect(screen.getByLabelText('Ground or village').props.value).toBe('ग्राम एरमसाही');
    expect(screen.getByLabelText('Prize 1').props.value).toBe('₹15000 एवं ट्रॉफी');
    expect(screen.getAllByLabelText('Award')[0].props.value).toBe('बेस्ट रेडर');
    expect(screen.getAllByLabelText('Contact number')[1].props.value).toBe('7987476601');
  });

  it('says what it assumed, on the field it is about, instead of filling it in silently', async () => {
    noticesApi.extractPoster.mockResolvedValue(READING);
    await renderForm();

    await readPoster();

    await screen.findByText(/please check them/i);
    // Once in the reading's summary and once under the date itself.
    expect(screen.getAllByText(/read day-first, the Indian way/i).length).toBe(2);
  });

  it('submits nothing by itself, and sends what was read once the organiser does', async () => {
    noticesApi.extractPoster.mockResolvedValue(READING);
    await renderForm();

    await readPoster();
    await screen.findByText(/please check them/i);
    expect(noticesApi.submit).not.toHaveBeenCalled();

    await announce();

    await waitFor(() => expect(noticesApi.submit).toHaveBeenCalled());
    expect(noticesApi.submit.mock.calls[0][0]).toEqual({
      title: READING.draft.title,
      startDate: '2026-12-05',
      endDate: '2026-12-06',
      posterUrl: mockAsset.url,
      description: undefined,
      startTime: undefined,
      venue: 'ग्राम एरमसाही',
      entryFee: '₹300',
      rules: undefined,
      organiserName: 'समस्त ग्रामवासी एरमसाही',
      location: { state: 'CG', district: 'Bilaspur' },
      prizes: [
        { position: 1, prize: '₹15000 एवं ट्रॉफी' },
        { position: 2, prize: '₹10000 एवं ट्रॉफी' },
      ],
      awards: [{ title: 'बेस्ट रेडर', prize: '₹1000' }],
      contacts: [
        { name: 'विजेंद्र पटेल', phone: '7999010354' },
        { name: undefined, phone: '7987476601' },
      ],
    });
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('says why when the reader cannot help, and leaves the form to be typed in', async () => {
    noticesApi.extractPoster.mockRejectedValue({ code: 'POSTER_AI_RATE_LIMITED' });
    await renderForm();

    await readPoster();

    await screen.findByText(/too many posters are being read just now/i);
    expect(screen.getByLabelText('Tournament name').props.value).toBe('');
    expect(screen.getByLabelText('Tournament name').props.editable).not.toBe(false);
  });

  it('names the tournament the poster is already on, opens it, and fills nothing', async () => {
    noticesApi.extractPoster.mockRejectedValue({
      code: 'NOTICE_POSTER_ALREADY_ANNOUNCED',
      details: { id: 'n9', title: 'Gram Eramsahi Kabaddi', startDate: '2026-12-05T00:00:00.000Z' },
    });
    await renderForm();

    await readPoster();

    await screen.findByText(/This poster is already on KhelScore: "Gram Eramsahi Kabaddi"/);
    expect(screen.getByLabelText('Tournament name').props.value).toBe('');
    fireEvent.press(screen.getByRole('button', { name: 'See it' }));
    expect(mockPush).toHaveBeenCalledWith('/notice/n9');
  });

  // A WhatsApp forward of the poster has different bytes, so only its reading
  // can tell it is a repeat — and the organiser hears it with the reading.
  it('says straight after reading when the same tournament is already announced', async () => {
    noticesApi.extractPoster.mockResolvedValue({
      ...READING,
      similar: { id: 'n9', title: READING.draft.title, startDate: '2026-12-05T00:00:00.000Z' },
    });
    await renderForm();

    await readPoster();

    await screen.findByText(/A tournament with this name is already announced for/);
    // Still a suggestion: the form is filled and nothing is sent.
    expect(screen.getByLabelText('Tournament name').props.value).toBe(READING.draft.title);
    expect(noticesApi.submit).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'See it' }));
    expect(mockPush).toHaveBeenCalledWith('/notice/n9');
  });

  // Staging has no key. An offer that always fails is worse than no offer.
  it('does not offer to read a poster on a server that cannot', async () => {
    noticesApi.config.mockResolvedValue({ posterReader: false });
    await renderForm();

    await waitFor(() => expect(noticesApi.config).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText('Upload Poster'));

    expect(screen.queryByText('Fill from poster')).toBeNull();
    expect(noticesApi.extractPoster).not.toHaveBeenCalled();
  });

  it('offers nothing to read until a poster is uploaded', async () => {
    await renderForm();
    await waitFor(() => expect(noticesApi.config).toHaveBeenCalled());

    expect(screen.queryByText('Fill from poster')).toBeNull();
  });
});

describe('sending it', () => {
  // Two villages really can hold one on the same Sunday, so the same name on
  // the same day is asked about rather than refused.
  it('asks before announcing one that looks like a repeat, then sends it', async () => {
    noticesApi.extractPoster.mockResolvedValue(READING);
    noticesApi.submit
      .mockRejectedValueOnce({
        code: 'NOTICE_SIMILAR_EXISTS',
        details: {
          id: 'n0',
          title: 'Gram Eramsahi Kabaddi',
          startDate: '2026-12-05T00:00:00.000Z',
        },
      })
      .mockResolvedValueOnce({ id: 'n2' });
    await renderForm();

    await readPoster();
    await screen.findByText(/please check them/i);
    await announce();

    // Not sent yet — the organiser is shown what it clashes with.
    await screen.findByText(/already announced for/i);
    expect(noticesApi.submit.mock.calls[0][0].allowDuplicate).toBeUndefined();

    fireEvent.press(screen.getByRole('button', { name: 'Announce anyway' }));

    await waitFor(() => expect(noticesApi.submit).toHaveBeenCalledTimes(2));
    expect(noticesApi.submit.mock.calls[1][0].allowDuplicate).toBe(true);
  });

  it('will not send half an award, because the person meant to announce it', async () => {
    noticesApi.extractPoster.mockResolvedValue(READING);
    await renderForm();

    await readPoster();
    await screen.findByText(/please check them/i);
    fireEvent.changeText(screen.getAllByLabelText('Award')[1], 'मैन ऑफ द सीरीज');
    await announce();

    await screen.findByText('This field is required');
    expect(noticesApi.submit).not.toHaveBeenCalled();
  });

  it('says how long a tournament name has to be', async () => {
    await renderForm();

    fireEvent.changeText(screen.getByLabelText('Tournament name'), 'Gram');
    await announce();

    await screen.findByText('Tournament name must be at least 5 characters');
    expect(noticesApi.submit).not.toHaveBeenCalled();
  });

  it('will not send without a name and a date', async () => {
    await renderForm();

    await announce();

    await waitFor(() => expect(screen.getAllByText('This field is required').length).toBe(1));
    expect(noticesApi.submit).not.toHaveBeenCalled();
  });
});
