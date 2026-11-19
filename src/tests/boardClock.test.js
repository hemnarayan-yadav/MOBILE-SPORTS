import { clockElapsedMs, clockRemainingSeconds } from '../utils/format.js';
import {
  DEFAULT_HALF_MINUTES,
  IDLE_CLOCK,
  RAID_SECONDS,
  clampHalfMinutes,
  isRunning,
  minutesToSeconds,
  pauseClock,
  resetClock,
  shiftClock,
  startClock,
  toggleClock,
} from '../utils/boardClock.js';
import {
  BOARD_PHASES,
  halfOf,
  isInPlay,
  useBoardStore,
} from '../store/boardStore.js';
import {
  BOARD_THEMES,
  BOARD_THEME_LIST,
  boardPalette,
  raidTone,
} from '../components/scoreboard/boardTheme.js';
import { COUNTDOWN_AT_SECONDS } from '../lib/boardSounds.js';

const T0 = Date.UTC(2026, 10, 9, 10, 0, 0);
const at = (seconds) => T0 + seconds * 1000;

describe('the scoreboard clock', () => {
  it('counts nothing until it is started', () => {
    expect(isRunning(IDLE_CLOCK)).toBe(false);
    expect(clockElapsedMs(IDLE_CLOCK, at(300))).toBe(0);
  });

  it('counts from the moment it starts, without storing a count', () => {
    const running = startClock(IDLE_CLOCK, T0);

    // The state holds two numbers; the elapsed time is worked out when read.
    expect(running).toEqual({ runningSince: T0, elapsedMs: 0 });
    expect(clockElapsedMs(running, at(90))).toBe(90_000);
  });

  it('keeps what it counted when paused, and carries on from there', () => {
    const paused = pauseClock(startClock(IDLE_CLOCK, T0), at(90));
    expect(paused).toEqual({ runningSince: null, elapsedMs: 90_000 });

    // Nothing accrues while it is stopped, however long that is.
    expect(clockElapsedMs(paused, at(600))).toBe(90_000);

    const resumed = startClock(paused, at(600));
    expect(clockElapsedMs(resumed, at(630))).toBe(120_000);
  });

  it('starts and stops on the same toggle', () => {
    const started = toggleClock(IDLE_CLOCK, T0);
    expect(isRunning(started)).toBe(true);
    expect(isRunning(toggleClock(started, at(10)))).toBe(false);
  });

  it('leaves a clock alone when told to do what it is already doing', () => {
    const running = startClock(IDLE_CLOCK, T0);
    // Starting a running clock must not rebase it, or time would be lost.
    expect(startClock(running, at(30))).toBe(running);
    expect(pauseClock(IDLE_CLOCK, at(30))).toBe(IDLE_CLOCK);
  });

  describe('correcting the time', () => {
    const HALF = minutesToSeconds(DEFAULT_HALF_MINUTES);

    it('gives time back and takes it away, in remaining-time terms', () => {
      const spentTwo = pauseClock(startClock(IDLE_CLOCK, T0), at(120));

      expect(clockElapsedMs(shiftClock(spentTwo, 60, HALF, at(120)), at(120))).toBe(60_000);
      expect(clockElapsedMs(shiftClock(spentTwo, -60, HALF, at(120)), at(120))).toBe(180_000);
    });

    it('never gives back more than the half is long, nor runs it past the end', () => {
      const spentTwo = pauseClock(startClock(IDLE_CLOCK, T0), at(120));

      // A generous correction stops at a full half.
      expect(clockRemainingSeconds(shiftClock(spentTwo, 9999, HALF, at(120)), HALF, at(120))).toBe(HALF);
      // And a harsh one stops at the buzzer, never beyond it.
      expect(clockRemainingSeconds(shiftClock(spentTwo, -9999, HALF, at(120)), HALF, at(120))).toBe(0);
    });

    it('keeps a running clock running, losing nothing in the move', () => {
      const running = startClock(IDLE_CLOCK, T0);
      const moved = shiftClock(running, 60, HALF, at(120));

      expect(isRunning(moved)).toBe(true);
      // Two minutes spent, one given back, then thirty seconds more.
      expect(clockElapsedMs(moved, at(150))).toBe(90_000);
    });
  });

  it('holds the raid to the thirty seconds the sport gives it', () => {
    expect(RAID_SECONDS).toBe(30);
    const raid = startClock(resetClock(), T0);
    expect(clockRemainingSeconds(raid, RAID_SECONDS, at(12))).toBe(18);
    // It stops at nothing rather than going negative.
    expect(clockRemainingSeconds(raid, RAID_SECONDS, at(45))).toBe(0);
  });

  it('keeps a typed half length to something a match can be played to', () => {
    expect(clampHalfMinutes(10)).toBe(10);
    expect(clampHalfMinutes(0)).toBe(1);
    expect(clampHalfMinutes(999)).toBe(60);
    expect(clampHalfMinutes('abc')).toBe(1);
    expect(clampHalfMinutes(12.4)).toBe(12);
  });
});

describe('the scoreboard state', () => {
  const board = () => useBoardStore.getState();

  beforeEach(() => {
    board().newMatch();
    board().setHalfMinutes(1, DEFAULT_HALF_MINUTES);
    board().setHalfMinutes(2, DEFAULT_HALF_MINUTES);
  });

  it('starts a match at nothing, in the first half, with ten-minute halves', () => {
    expect(board().teams.A.score).toBe(0);
    expect(board().phase).toBe(BOARD_PHASES.FIRST);
    expect(board().halfSeconds[1]).toBe(600);
    expect(halfOf(board().phase)).toBe(1);
  });

  it('adds a point at a time and takes one back, never below zero', () => {
    board().addPoint('A', 1);
    board().addPoint('A', 1);
    expect(board().teams.A.score).toBe(2);

    board().addPoint('A', -1);
    expect(board().teams.A.score).toBe(1);

    board().addPoint('B', -1);
    expect(board().teams.B.score).toBe(0);
  });

  it('holds the raid clock when the match clock stops', () => {
    board().toggleMatchClock();
    board().startRaid();
    expect(isRunning(board().raid)).toBe(true);

    board().toggleMatchClock();
    expect(isRunning(board().clock)).toBe(false);
    // A raid cannot be running while the match is not.
    expect(isRunning(board().raid)).toBe(false);
  });

  it('restarts the raid from thirty on every tap', () => {
    board().toggleMatchClock();
    board().startRaid();
    const first = board().raid.runningSince;

    board().startRaid();
    expect(board().raid.elapsedMs).toBe(0);
    expect(board().raid.runningSince).toBeGreaterThanOrEqual(first);
  });

  // One button, two steps: End Half 1, then End Match. There is no half-time
  // screen — the owner's choice, following the design.
  it('walks through the halves one way only', () => {
    board().toggleMatchClock();
    board().endHalf();

    expect(board().phase).toBe(BOARD_PHASES.SECOND);
    expect(halfOf(board().phase)).toBe(2);
    expect(isInPlay(board().phase)).toBe(true);
    // Both clocks start the second half at nothing.
    expect(board().clock).toEqual(IDLE_CLOCK);
    expect(board().raid).toEqual(IDLE_CLOCK);

    // Nothing moves out of turn: a second End Half does not go back a half.
    board().endHalf();
    expect(board().phase).toBe(BOARD_PHASES.SECOND);

    board().endMatch();
    expect(board().phase).toBe(BOARD_PHASES.FULL_TIME);
    expect(board().endedAt).toEqual(expect.any(Number));
  });

  it('refuses to run the clock once the match is over', () => {
    board().toggleMatchClock();
    board().endHalf();
    board().endMatch();

    board().toggleMatchClock();
    expect(isRunning(board().clock)).toBe(false);
    board().startRaid();
    expect(isRunning(board().raid)).toBe(false);
  });

  it('clears the match but keeps the settings', () => {
    board().setHalfMinutes(1, 15);
    board().setTheme(BOARD_THEMES.NIGHT);
    board().setSound(false);
    board().addPoint('A', 1);
    board().setName('A', 'Biroda King');

    board().newMatch();

    expect(board().teams.A).toEqual({ name: '', score: 0 });
    expect(board().phase).toBe(BOARD_PHASES.FIRST);
    // Settings are not part of a match.
    expect(board().halfSeconds[1]).toBe(900);
    expect(board().theme).toBe(BOARD_THEMES.NIGHT);
    expect(board().sound).toBe(false);
  });

  // Two looks, and only those two: the board opens on the daylight one.
  it('offers the two board looks and refuses anything else', () => {
    expect(BOARD_THEME_LIST).toEqual([BOARD_THEMES.CLEAN, BOARD_THEMES.NIGHT]);

    board().setTheme(BOARD_THEMES.NIGHT);
    expect(board().theme).toBe(BOARD_THEMES.NIGHT);

    // The broadcast look was removed; neither it nor anything else is taken.
    board().setTheme('broadcast');
    expect(board().theme).toBe(BOARD_THEMES.NIGHT);
    board().setTheme('neon');
    expect(board().theme).toBe(BOARD_THEMES.NIGHT);
  });

  it('colours the raid number by what is left of it', () => {
    const p = boardPalette(BOARD_THEMES.CLEAN);
    expect(raidTone(p, 30, false)).toBe(p.raidIdle);
    expect(raidTone(p, 25, true)).toBe(p.raidOk);
    expect(raidTone(p, 15, true)).toBe(p.raidWarn);
    expect(raidTone(p, 7, true)).toBe(p.raidUrgent);
    // The countdown take starts as the clock crosses ten.
    expect(COUNTDOWN_AT_SECONDS).toBe(10);
  });

  // The property the whole design rests on: a running clock must not change
  // any stored value, or the board would write to storage every second.
  it('writes nothing while a clock runs', () => {
    board().toggleMatchClock();
    board().startRaid();
    const saved = JSON.stringify(
      (({ teams, phase, clock, raid, halfSeconds }) => ({ teams, phase, clock, raid, halfSeconds }))(board()),
    );

    // Time passes; nothing in the state moves with it.
    expect(clockElapsedMs(board().clock, Date.now() + 60_000)).toBeGreaterThan(0);
    expect(
      JSON.stringify(
        (({ teams, phase, clock, raid, halfSeconds }) => ({ teams, phase, clock, raid, halfSeconds }))(board()),
      ),
    ).toBe(saved);
  });
});
