import { fireEvent, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import UpdatePrompt from '../components/common/UpdatePrompt.jsx';
import { useUiStore } from '../store/uiStore.js';
import { fakeApi, ok, renderWithQuery } from './helpers.jsx';

// A newer release, offered once. Not the hard case — an app too old to run at
// all is the gate's (profileAndGate.test.jsx) — this one asks and takes no for
// an answer, per version.

// app.config.js carries 1.5.0, which is what Constants reports here.
const CURRENT = '1.5.0';

let api;
const config = (latest, min = '1.0.0') => {
  api = fakeApi(({ url }) =>
    url.includes('/mobile/config')
      ? ok({
          minSupportedVersion: { [Platform.OS]: min },
          latestVersion: { [Platform.OS]: latest },
        })
      : ok({}),
  );
};

beforeEach(() => {
  useUiStore.setState({ updateSkipped: null });
});

afterEach(() => {
  api?.restore();
  api = undefined;
});

describe('the update the app offers', () => {
  it('says nothing while this build is the one on the store', async () => {
    config(CURRENT);
    await renderWithQuery(<UpdatePrompt />);

    expect(screen.queryByText('app.updateAvailableTitle')).toBeNull();
  });

  it('says nothing at all until a version is published', async () => {
    config(null);
    await renderWithQuery(<UpdatePrompt />);

    expect(screen.queryByText('app.updateAvailableTitle')).toBeNull();
  });

  it('offers the newer version, and remembers a no', async () => {
    config('1.6.0');
    await renderWithQuery(<UpdatePrompt />);

    expect(await screen.findByText('app.updateAvailableTitle')).toBeTruthy();
    fireEvent.press(screen.getByText('app.updateLater'));

    expect(useUiStore.getState().updateSkipped).toBe('1.6.0');
  });

  it('does not ask again for a version already set aside', async () => {
    useUiStore.setState({ updateSkipped: '1.6.0' });
    config('1.6.0');
    await renderWithQuery(<UpdatePrompt />);

    expect(screen.queryByText('app.updateAvailableTitle')).toBeNull();
  });

  it('asks again when the next release is out', async () => {
    useUiStore.setState({ updateSkipped: '1.6.0' });
    config('1.7.0');
    await renderWithQuery(<UpdatePrompt />);

    expect(await screen.findByText('app.updateAvailableTitle')).toBeTruthy();
  });
});
