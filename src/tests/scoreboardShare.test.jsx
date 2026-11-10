// Sharing the full-time card.
//
// A file of its own, for the reason set out at the top of scoreboard.test.jsx:
// in this renderer a test that fires an event leaves every later `render` in
// the same file empty, so the one test that presses Share has to be the only
// one that presses anything.
jest.mock('../lib/boardNative.js', () => ({
  holdScreenOn: jest.fn().mockResolvedValue(true),
  releaseScreen: jest.fn().mockResolvedValue(true),
  lockOrientation: jest.fn().mockResolvedValue(true),
  canShare: jest.fn().mockResolvedValue(true),
}));
jest.mock('../lib/shareResultCard.js', () => ({ shareResultCard: jest.fn().mockResolvedValue(true) }));
jest.mock('../lib/boardSounds.js', () => ({
  COUNTDOWN_AT_SECONDS: 10,
  playBoardSound: jest.fn(),
  stopCountdown: jest.fn(),
  releaseBoardSounds: jest.fn(),
}));

import { act, fireEvent, render } from '@testing-library/react-native';
import ScoreboardScreen from '../app/scoreboard.jsx';
import { shareResultCard } from '../lib/shareResultCard.js';
import { useBoardStore } from '../store/boardStore.js';
import '../i18n/index.js';

const board = () => useBoardStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  board().newMatch();
});

afterEach(() => {
  jest.useRealTimers();
});

it('hands the finished card to the share sheet as a picture', async () => {
  board().setName('A', 'Biroda King');
  board().setName('B', 'Durg Dabang');
  board().addPoint('A', 5);
  board().addPoint('B', 3);
  board().endHalf();
  board().endMatch();

  const view = await render(<ScoreboardScreen />);
  await act(async () => {});

  fireEvent.press(view.getByText('Share result'));
  await act(async () => {});

  // The card itself is what is captured, so the picture can never disagree
  // with the board it came from.
  expect(shareResultCard).toHaveBeenCalledTimes(1);
  const [ref, title] = shareResultCard.mock.calls[0];
  expect(ref.current).toBeTruthy();
  expect(title).toBe('Match result');
});
