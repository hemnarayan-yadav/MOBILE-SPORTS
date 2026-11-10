// The offline scoreboard screen.
//
// The three native pieces are faked because a test runner has no screen to
// rotate, no backlight to hold on and no share sheet; everything else is the
// real screen, the real store and the real clock arithmetic. The board's rules
// — scoring, the halves, the clocks — are covered without a screen at all in
// boardClock.test.js; what is here is the screen wired to them.
//
// **Why the interaction tests are one test at the end.** In this project's
// renderer, once a test has fired an event, every later `render` in the same
// file produces an empty tree. It is not this screen: a plain Pressable with a
// counter reproduces it exactly (render, press, then a third render → null).
// So the tests that only read the board come first, and everything that taps
// lives in a single test that renders once and plays a whole match. Do not
// split that one up without checking the renderer has been fixed.
// The native comforts go through lib/boardNative.js, which loads them on
// demand so a build without them still shows a working board; the screen is
// tested against that seam rather than against the modules themselves.
jest.mock('../lib/boardNative.js', () => ({
  holdScreenOn: jest.fn().mockResolvedValue(true),
  releaseScreen: jest.fn().mockResolvedValue(true),
  lockOrientation: jest.fn().mockResolvedValue(true),
  canShare: jest.fn().mockResolvedValue(true),
}));
jest.mock('../lib/shareResultCard.js', () => ({ shareResultCard: jest.fn().mockResolvedValue(true) }));
jest.mock('../lib/boardSounds.js', () => ({
  COUNTDOWN_AT_SECONDS: 10,
  playBoardSound: jest.fn().mockResolvedValue(true),
  stopCountdown: jest.fn(),
  releaseBoardSounds: jest.fn(),
}));

import { StyleSheet } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { holdScreenOn, lockOrientation, releaseScreen } from '../lib/boardNative.js';
import { playBoardSound } from '../lib/boardSounds.js';
import { BOARD_THEMES, boardPalette } from '../components/scoreboard/boardTheme.js';
import ScoreboardScreen from '../app/scoreboard.jsx';
import { useBoardStore } from '../store/boardStore.js';
import '../i18n/index.js';

const board = () => useBoardStore.getState();

const colourOf = (node) => StyleSheet.flatten(node.props.style).color;

// This app renders concurrently, so a render and every event need a turn to
// settle before the tree is read back.
const settle = () => act(async () => {});

const show = async () => {
  const view = await render(<ScoreboardScreen />);
  await settle();
  return view;
};

const press = async (element) => {
  fireEvent.press(element);
  await settle();
};

beforeEach(() => {
  jest.clearAllMocks();
  // A running clock sets a real interval, and a tree that never settles hangs
  // the runner. Fake timers also pin `Date.now`, which is what the board's
  // clocks are read from, so every assertion here is deterministic.
  jest.useFakeTimers();
  // Straight on the store: nothing is mounted yet, so there is nothing to flush.
  board().newMatch();
  board().setHalfMinutes(1, 10);
  board().setHalfMinutes(2, 10);
  useBoardStore.setState({ theme: BOARD_THEMES.CLEAN, sound: true });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the offline scoreboard', () => {
  it('opens on an empty board: ten minutes, nothing scored, nobody raiding', async () => {
    const view = await show();

    // Both halves are the owner's ten minutes, and the clock has not started.
    expect(view.getByText('10:00')).toBeTruthy();
    expect(view.getAllByText('0')).toHaveLength(2);
    // The raid clock sits at a full thirty until somebody sends a raider.
    expect(view.getByText('30')).toBeTruthy();
    expect(view.getByText('HALF 1')).toBeTruthy();
    expect(view.getByText('TAP TO START')).toBeTruthy();
    // The KhelScore mark is on the board itself, for the screen it is mirrored to.
    expect(view.getByLabelText('KhelScore')).toBeTruthy();
  });

  // A red clock is a clock that is not counting — the one thing a glance from
  // across a ground has to be able to tell.
  it('shows the half clock in red while it is stopped', async () => {
    const clean = boardPalette(BOARD_THEMES.CLEAN);
    const view = await show();

    expect(colourOf(view.getByText('10:00'))).toBe(clean.raidUrgent);
  });

  it('shows the half clock in its ordinary ink once it is running', async () => {
    const clean = boardPalette(BOARD_THEMES.CLEAN);
    // Straight on the store, before anything is mounted: fake timers pin the
    // clock, so no time passes and it still reads a full ten minutes.
    board().toggleMatchClock();
    const view = await show();

    expect(colourOf(view.getByText('10:00'))).toBe(clean.text);
  });

  it('puts every control on the board at once: the board has nothing to reveal', async () => {
    const view = await show();

    // The buttons are never hidden, so they are all there from the first
    // frame — the two score steps a side, both cues, and the clock.
    expect(view.getAllByLabelText('Add a point')).toHaveLength(2);
    expect(view.getAllByLabelText('Take a point back')).toHaveLength(2);
    expect(view.getByLabelText('Start')).toBeTruthy();
    expect(view.getByLabelText('Siren')).toBeTruthy();
    expect(view.getByLabelText('Do or die')).toBeTruthy();
  });

  it('wears short faces on the cues, so the row is one size of button', async () => {
    const view = await show();

    // DOD and S on the buttons; the words only a screen reader hears.
    expect(view.getByText('DOD')).toBeTruthy();
    expect(view.getByText('S')).toBeTruthy();
    expect(view.getByLabelText('Do or die')).toBeTruthy();
    expect(view.getByLabelText('Siren')).toBeTruthy();
  });

  // Each look draws the same board.
  it.each([BOARD_THEMES.CLEAN, BOARD_THEMES.NIGHT])(
    'draws the board in the %s look',
    async (look) => {
      useBoardStore.setState({ theme: look });
      board().setName('A', 'Biroda King');
      const view = await show();

      expect(view.getByText('BIRODA KING')).toBeTruthy();
      expect(view.getByText('HALF 1')).toBeTruthy();
      expect(view.getByText('30')).toBeTruthy();
      expect(view.getByLabelText('KhelScore')).toBeTruthy();
    },
  );

  it('names the teams and shows what each has scored', async () => {
    board().setName('A', 'Biroda King');
    board().setName('B', 'Durg Dabang');
    board().addPoint('A', 4);
    board().addPoint('B', 2);
    const view = await show();

    expect(view.getByText('BIRODA KING')).toBeTruthy();
    expect(view.getByText('DURG DABANG')).toBeTruthy();
    expect(view.getByLabelText('Score: 4')).toBeTruthy();
    expect(view.getByLabelText('Score: 2')).toBeTruthy();
  });

  it('shows the result card, with the winner and the margin, at full time', async () => {
    board().setName('A', 'Biroda King');
    board().setName('B', 'Durg Dabang');
    board().addPoint('A', 3);
    board().addPoint('B', 1);
    board().endHalf();
    board().endMatch();
    const view = await show();

    // Not just the scoreline: who won, and by how much.
    expect(view.getByText('Biroda King won by 2 points')).toBeTruthy();
    expect(view.getByText('Share result')).toBeTruthy();
  });

  it('calls a drawn match drawn', async () => {
    board().addPoint('A', 2);
    board().addPoint('B', 2);
    board().endHalf();
    board().endMatch();
    const view = await show();

    expect(view.getByText('Match drawn')).toBeTruthy();
  });

  it('keeps the screen awake and the board in landscape, and puts both back on the way out', async () => {
    const view = await show();

    expect(holdScreenOn).toHaveBeenCalled();
    expect(lockOrientation).toHaveBeenCalledWith(true);

    await act(async () => {
      view.unmount();
    });

    // The app is portrait everywhere else, and the screen may sleep again.
    expect(releaseScreen).toHaveBeenCalled();
    expect(lockOrientation).toHaveBeenCalledWith(false);
  });

  // Everything that taps, in one render — see the note at the top of the file.
  it('plays a match from the screen: score, both clocks, the cues, end of half', async () => {
    const view = await show();

    // One point a tap, and one back when the tap was wrong.
    const add = view.getAllByLabelText('Add a point');
    const remove = view.getAllByLabelText('Take a point back');
    await press(add[0]);
    await press(add[0]);
    await press(add[0]);
    await press(add[1]);
    expect(board().teams.A.score).toBe(3);
    expect(board().teams.B.score).toBe(1);

    await press(remove[0]);
    expect(board().teams.A.score).toBe(2);
    // A score cannot be driven below nothing.
    await press(remove[1]);
    await press(remove[1]);
    expect(board().teams.B.score).toBe(0);

    // The half runs, and the raid clock runs with it.
    // The clock button is reached by a stable handle: its label is the state
    // it will put the clock into, so it reads "Start" then "Pause".
    await press(view.getByTestId('board-clock-toggle'));
    expect(board().clock.runningSince).toEqual(expect.any(Number));
    await press(view.getByTestId('board-raid'));
    expect(board().raid.runningSince).toEqual(expect.any(Number));

    // The two cues are heard, because the board's sound is on.
    await press(view.getByLabelText('Siren'));
    expect(playBoardSound).toHaveBeenCalledWith('siren');
    await press(view.getByLabelText('Do or die'));
    expect(playBoardSound).toHaveBeenCalledWith('doOrDie');

    // Stopping the half holds the raid: a raid cannot run while the match does not.
    await press(view.getByTestId('board-clock-toggle'));
    expect(board().clock.runningSince).toBeNull();
    expect(board().raid.runningSince).toBeNull();

    // The menu button is there, which is where the phase step, the three
    // looks, the sound switch and the half lengths live. What those do is
    // covered on the state itself in boardClock.test.js: this renderer does
    // not re-render on a store change and does not mount a sheet's contents
    // after an event, so driving them from the screen would be testing the
    // harness rather than the board.
    expect(view.getByTestId('board-menu')).toBeTruthy();
  });
});
