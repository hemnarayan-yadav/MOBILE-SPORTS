import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { BackHeader } from '../components/common/Layout.jsx';
import { renderWithQuery } from './helpers.jsx';

// This app is read by following links — a tournament leads to a team, the team
// to a player — so the way back to the start cannot be four taps.

beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockClear?.());
});

describe('the header of a stack screen', () => {
  it('goes back one screen when there is one', async () => {
    await renderWithQuery(<BackHeader title="Super Seven" />);

    fireEvent.press(screen.getByLabelText('common.back'));

    expect(router.back).toHaveBeenCalled();
  });

  it('empties the stack on the way home, so Back does not walk into it again', async () => {
    await renderWithQuery(<BackHeader title="Super Seven" />);

    fireEvent.press(screen.getByLabelText('nav.home'));

    expect(router.dismissAll).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith('/');
  });
});
