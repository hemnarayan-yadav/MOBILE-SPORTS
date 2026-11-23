jest.mock('../lib/shareResultCard.js', () => ({ shareResultCard: jest.fn() }));

import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import i18n from '../i18n/index.js';
import ShareImageButton from '../components/common/ShareImageButton.jsx';
import NoticeHost from '../components/common/NoticeHost.jsx';
import { shareResultCard } from '../lib/shareResultCard.js';
import { renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });

// The square picture of a team, player or tournament, from the API, shared
// through the system sheet the way the scoreboard's result card is.
const open = async () => {
  await renderWithQuery(
    <>
      <ShareImageButton kind="team" id="t1" name="Biroda King" />
      <NoticeHost />
    </>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Share a picture of Biroda King' }));
};

beforeEach(() => resetSession());

const shareButton = () => screen.getByRole('button', { name: 'Share' });

afterEach(async () => {
  shareResultCard.mockReset();
  await i18n.changeLanguage('en');
});

describe('sharing a picture from the app', () => {
  it('shows the card the API draws, in the app’s language', async () => {
    await i18n.changeLanguage('hi');
    await renderWithQuery(<ShareImageButton kind="player" id="p1" name="रवि" />);
    await fireEvent.press(screen.getByRole('button'));

    const image = screen.getByTestId('share-card-image');
    expect(image.props.source.uri).toMatch(/\/cards\/share\/player\/p1\.jpg\?lang=hi$/);
  });

  it('shares only once the picture has arrived, through the scoreboard’s share path', async () => {
    shareResultCard.mockResolvedValue(true);
    await open();

    expect(shareButton()).toBeDisabled();
    await fireEvent(screen.getByTestId('share-card-image'), 'load');
    expect(shareButton()).toBeEnabled();

    await fireEvent.press(shareButton());
    await waitFor(() => expect(shareResultCard).toHaveBeenCalledWith(expect.objectContaining({ current: expect.anything() }), 'Biroda King'));
  });

  it('says so when the picture cannot be shared or cannot be loaded', async () => {
    shareResultCard.mockResolvedValue(false);
    await open();
    await fireEvent(screen.getByTestId('share-card-image'), 'load');
    await fireEvent.press(shareButton());
    expect(await screen.findByText("Couldn't share the picture. Try again.")).toBeTruthy();
  });

  it('keeps Share off when the picture fails to load', async () => {
    await open();
    await fireEvent(screen.getByTestId('share-card-image'), 'error');
    expect(screen.getByText("Couldn't share the picture. Try again.")).toBeTruthy();
    expect(shareButton()).toBeDisabled();
  });
});
