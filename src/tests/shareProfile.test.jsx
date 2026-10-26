// Sharing a player's profile.
//
// The link is to the **website**, not a deep link into the app: whoever
// receives it may not have KhelScore installed, and the web page already
// carries a title and an image for the preview. Anyone who does have the app
// opens it there anyway, because App Links claim those paths.
import { fireEvent, screen } from '@testing-library/react-native';
import { Platform, Share } from 'react-native';
import ShareButton from '../components/common/ShareButton.jsx';
import { env } from '../config/env.js';
// Importing the app's own instance is what initialises react-i18next; without
// it every `useTranslation` in the tree renders untranslated.
import '../i18n/index.js';
import { renderWithQuery } from './helpers.jsx';

const renderButton = (props = {}) =>
  renderWithQuery(<ShareButton path="/player/p1" title="Roshan Yadav" {...props} />);

let shareSpy;
let platform;

beforeEach(() => {
  shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  platform = Platform.OS;
});

afterEach(() => {
  shareSpy.mockRestore();
  Platform.OS = platform;
});

describe('sharing a profile', () => {
  it('hands the system sheet the website link, not a deep link', async () => {
    Platform.OS = 'android';
    await renderButton();

    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));

    const [content] = shareSpy.mock.calls[0];
    // Android has one field, so the url has to be inside the message or it is
    // dropped — the mistake this test exists to catch.
    expect(content.message).toContain(`${env.SITE_URL}/player/p1`);
    expect(content.message).toContain('Roshan Yadav');
  });

  it('gives iOS the url separately, as that platform expects', async () => {
    Platform.OS = 'ios';
    await renderButton();

    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));

    const [content] = shareSpy.mock.calls[0];
    expect(content.url).toBe(`${env.SITE_URL}/player/p1`);
    expect(content.message).toBe('Roshan Yadav');
  });

  it('names the person in the button, for anyone using a screen reader', async () => {
    await renderButton({ label: "Share Roshan Yadav's profile" });
    expect(screen.getByRole('button', { name: "Share Roshan Yadav's profile" })).toBeTruthy();
  });

  it('says nothing when the sheet is dismissed or fails', async () => {
    // A cancelled share rejects on some devices; it is not an error worth
    // telling anybody about.
    shareSpy.mockRejectedValue(new Error('dismissed'));
    await renderButton();

    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    // Reaching here without an unhandled rejection is the assertion.
    expect(shareSpy).toHaveBeenCalled();
  });
});
