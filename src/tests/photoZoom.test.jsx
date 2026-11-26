import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import PhotoZoom from '../components/common/PhotoZoom.jsx';
import '../i18n/index.js';
import { renderWithQuery } from './helpers.jsx';

// A profile picture opens large when tapped, as WhatsApp and Instagram open
// one, and closes by the ✕, by tapping outside it, or by the back button.
const PHOTO = 'https://cdn.test/player.jpg';

describe('a profile picture', () => {
  it('opens large with the name under it, and closes by the ✕', async () => {
    await renderWithQuery(
      <PhotoZoom src={PHOTO} name="Ravi Kumar">
        <Text>avatar</Text>
      </PhotoZoom>,
    );
    expect(screen.queryByText('Ravi Kumar')).toBeNull();

    await fireEvent.press(screen.getByLabelText("View Ravi Kumar's photo"));

    expect(screen.getByText('Ravi Kumar')).toBeTruthy();
    expect(screen.getByLabelText('Ravi Kumar').props.source.uri).toContain('player');

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Ravi Kumar')).toBeNull();
  });

  it('offers nothing to open where there is no picture, only initials', async () => {
    await renderWithQuery(
      <PhotoZoom src={null} name="Ravi Kumar">
        <Text>RK</Text>
      </PhotoZoom>,
    );

    expect(screen.getByText('RK')).toBeTruthy();
    expect(screen.queryByLabelText("View Ravi Kumar's photo")).toBeNull();
  });
});
