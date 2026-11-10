// The offline scoreboard's state.
//
// Nothing here ever reaches the network: no API, no socket, no analytics. The
// board is a tool somebody can open at a ground with no signal, and it must
// cost the server exactly nothing.
//
// It is saved to AsyncStorage like the app's other preferences, and the saving
// is cheap for one reason: **no value here changes while a clock runs**. Time
// lives in `{ runningSince, elapsedMs }` pairs that only move when somebody
// taps, so a forty-minute match writes a few dozen times, not two thousand.
// Anything added later must keep that property.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BOARD_THEMES, BOARD_THEME_LIST } from '../components/scoreboard/boardTheme.js';
import {
  DEFAULT_HALF_MINUTES,
  clampHalfMinutes,
  minutesToSeconds,
  pauseClock,
  resetClock,
  shiftClock,
  startClock,
  toggleClock,
} from '../utils/boardClock.js';

export const BOARD_STORAGE_KEY = 'lk-board';

export const SIDES = Object.freeze(['A', 'B']);

// First half → second half → full time, which is the one button the design
// shows: "End Half 1", then "End Match". There is no half-time screen — a
// board left at the interval simply has its clock stopped. The board never
// goes backwards on its own; "New match" is the only way back to the start.
export const BOARD_PHASES = Object.freeze({
  FIRST: 'first',
  SECOND: 'second',
  FULL_TIME: 'fullTime',
});

const IN_PLAY = [BOARD_PHASES.FIRST, BOARD_PHASES.SECOND];
export const isInPlay = (phase) => IN_PLAY.includes(phase);

export const halfOf = (phase) => (phase === BOARD_PHASES.FIRST ? 1 : 2);

const emptyMatch = () => ({
  teams: { A: { name: '', score: 0 }, B: { name: '', score: 0 } },
  phase: BOARD_PHASES.FIRST,
  clock: resetClock(),
  raid: resetClock(),
  // When the match finished, so the full-time card can date itself. Set once,
  // read only by the card.
  endedAt: null,
});

const initialState = () => ({
  ...emptyMatch(),
  // Per half, in seconds, because the two are allowed to differ.
  halfSeconds: { 1: minutesToSeconds(DEFAULT_HALF_MINUTES), 2: minutesToSeconds(DEFAULT_HALF_MINUTES) },
  // The board carries its own look rather than following the app's theme: the
  // phone may be set to dark while the match is played in sunlight, and a board
  // nobody can read in daylight is no board at all. `light` is the default for
  // exactly that reason (see components/scoreboard/boardTheme.js).
  theme: BOARD_THEMES.CLEAN,
  // Whether the siren, the do-or-die cue and the ten-second raid countdown are
  // heard. One switch for all three: a board is either making noise at a
  // ground or it is not.
  sound: true,
  // Hides the buttons for when the screen is mirrored to a monitor and the
  // crowd is looking at it. A tap brings them back.
  hasHydrated: false,
});

export const useBoardStore = create(
  persist(
    (set, get) => ({
      ...initialState(),

      setName: (side, name) =>
        set((state) => ({
          teams: { ...state.teams, [side]: { ...state.teams[side], name: String(name).slice(0, 24) } },
        })),

      // The only scoring there is: one point at a time, and one back when a tap
      // was wrong. A score never goes below zero.
      addPoint: (side, delta) =>
        set((state) => ({
          teams: {
            ...state.teams,
            [side]: { ...state.teams[side], score: Math.max(0, state.teams[side].score + delta) },
          },
        })),

      // Starting or stopping the half also holds the raid clock: a raid cannot
      // be running while the match is not.
      toggleMatchClock: () =>
        set((state) => {
          if (!isInPlay(state.phase)) return {};
          const now = Date.now();
          const clock = toggleClock(state.clock, now);
          return { clock, raid: clock.runningSince ? state.raid : pauseClock(state.raid, now) };
        }),

      // One raid, from its start. Tapping again restarts it, which is what a
      // scorer wants when the next raider is already on the mat.
      startRaid: () => set((state) => (isInPlay(state.phase) ? { raid: startClock(resetClock()) } : {})),
      clearRaid: () => set({ raid: resetClock() }),

      // Time added or taken off the half being played (see boardClock.js).
      shiftMatchClock: (seconds) =>
        set((state) => {
          if (!isInPlay(state.phase)) return {};
          const total = state.halfSeconds[halfOf(state.phase)];
          return { clock: shiftClock(state.clock, seconds, total, Date.now()) };
        }),

      setHalfMinutes: (half, minutes) =>
        set((state) => ({
          halfSeconds: { ...state.halfSeconds, [half]: minutesToSeconds(clampHalfMinutes(minutes)) },
        })),

      // The one path through a match. Each step stops both clocks, so nothing
      // keeps counting through the interval or after the whistle.
      endHalf: () =>
        set((state) =>
          state.phase === BOARD_PHASES.FIRST
            ? { phase: BOARD_PHASES.SECOND, clock: resetClock(), raid: resetClock() }
            : {},
        ),
      endMatch: () =>
        set((state) =>
          state.phase === BOARD_PHASES.SECOND
            ? {
                phase: BOARD_PHASES.FULL_TIME,
                clock: pauseClock(state.clock),
                raid: resetClock(),
                endedAt: Date.now(),
              }
            : {},
        ),

      setTheme: (theme) => set(() => (BOARD_THEME_LIST.includes(theme) ? { theme } : {})),
      setSound: (sound) => set({ sound: Boolean(sound) }),

      // Scores, names and clocks back to nothing. The half lengths and the
      // day/night choice are settings, not part of a match, so they stay.
      newMatch: () => set(emptyMatch()),

      // Reading the whole match at once, for the full-time card.
      matchSummary: () => {
        const { teams, halfSeconds, endedAt } = get();
        return { teams, halfSeconds, endedAt };
      },
    }),
    {
      name: BOARD_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Everything but `hasHydrated`, which describes this run rather than the
      // match. A clock pair is two numbers, so the whole board is a few hundred
      // bytes however long the match goes on.
      partialize: ({ teams, phase, clock, raid, halfSeconds, theme, sound, endedAt }) => ({
        teams,
        phase,
        clock,
        raid,
        halfSeconds,
        theme,
        sound,
        endedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // A board saved with a look that no longer exists — the broadcast one
        // was removed — opens on the default rather than on nothing.
        const theme = BOARD_THEME_LIST.includes(state.theme) ? state.theme : BOARD_THEMES.CLEAN;
        useBoardStore.setState({ hasHydrated: true, theme });
      },
    },
  ),
);
