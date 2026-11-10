// The scoreboard's two looks, and the sizes it is drawn at.
//
// The board does not follow the app's theme on purpose. The phone may be set
// to dark while the match is played at two in the afternoon, and this screen is
// made to be mirrored onto a monitor at a ground — so the board carries its own
// choice, and **Clean is the default**, because a dark board in sunlight is
// unreadable on a phone and washed out on a screen beside a window.
//
//   clean — white cards on a cool grey page. The daylight board, and the
//           colours of the owner's `A · Clean Light` design.
//   night — the same board in ink: no gradients, nothing to glare.
export const BOARD_THEMES = Object.freeze({
  CLEAN: 'light',
  NIGHT: 'night',
});

export const BOARD_THEME_LIST = Object.freeze(Object.values(BOARD_THEMES));

const CLEAN = Object.freeze({
  key: BOARD_THEMES.CLEAN,
  page: '#F3F5F9',
  panel: '#FFFFFF',
  line: '#E2E8F0',
  text: '#0B1020',
  muted: '#475569',
  faint: '#94A3B8',
  pill: '#E4E9F2',
  pillText: '#334155',
  teamA: '#C2410C',
  teamB: '#1E40AF',
  // The raid number, by how much is left: green, then amber, then red.
  raidIdle: '#334155',
  raidOk: '#16A34A',
  raidWarn: '#F59E0B',
  raidUrgent: '#DC2626',
  ringTrack: '#E2E8F0',
  dodBorder: '#FCA5A5',
  dodText: '#B91C1C',
  dodOn: '#DC2626',
  dodOnText: '#FFFFFF',
  sirenBorder: '#FCD34D',
  sirenText: '#B45309',
  sirenOn: '#F59E0B',
  sirenOnText: '#0B1020',
  control: '#CBD5E1',
  controlText: '#475569',
  accent: '#C2410C',
  onAccent: '#FFFFFF',
});

const NIGHT = Object.freeze({
  key: BOARD_THEMES.NIGHT,
  page: '#060A13',
  panel: '#111A2E',
  line: '#24324F',
  text: '#F6F3EE',
  muted: '#9AA3B8',
  faint: '#64748B',
  pill: '#111A2E',
  pillText: '#9AA3B8',
  teamA: '#F98037',
  teamB: '#60A5FA',
  raidIdle: '#9AA3B8',
  raidOk: '#4ADE80',
  raidWarn: '#FBBF24',
  raidUrgent: '#F87171',
  ringTrack: '#24324F',
  dodBorder: '#7F1D1D',
  dodText: '#F87171',
  dodOn: '#DC2626',
  dodOnText: '#FFFFFF',
  sirenBorder: '#78350F',
  sirenText: '#FBBF24',
  sirenOn: '#F59E0B',
  sirenOnText: '#0B1020',
  control: '#24324F',
  controlText: '#9AA3B8',
  accent: '#F98037',
  onAccent: '#11141E',
});

const PALETTES = Object.freeze({
  [BOARD_THEMES.CLEAN]: CLEAN,
  [BOARD_THEMES.NIGHT]: NIGHT,
});

export const boardPalette = (theme) => PALETTES[theme] ?? CLEAN;

/** The raid number's colour for what is left of its thirty seconds. */
export function raidTone(palette, remaining, running) {
  if (!running && remaining >= 30) return palette.raidIdle;
  if (remaining > 20) return palette.raidOk;
  if (remaining > 10) return palette.raidWarn;
  return palette.raidUrgent;
}

// Televisions crop the edge of what they are sent — older sets by as much as
// five percent — so nothing the board draws goes nearer the edge than this.
export const OVERSCAN = 0.05;

/**
 * Every size is a fraction of the screen's shorter side, so the same board
 * reads on a phone in the hand and on a monitor it is mirrored to. Worked out
 * once per screen size, never per frame.
 *
 * The middle column carries the lot — wordmark, half, clock, ring, cues — so
 * these fractions are chosen to **sum under the height available**. Added up
 * with the four gaps between them they come to about 0.82 of the shorter side,
 * against the 0.90 the gutters leave: roughly 8% of headroom on the shortest
 * landscape phone. Making any of them larger means taking it from another, or
 * a small phone clips.
 */
export function boardScale({ width, height }) {
  const short = Math.min(width, height);
  const ring = Math.round(short * 0.38);
  return {
    gutter: Math.round(short * OVERSCAN),
    logo: Math.round(short * 0.07),
    pill: Math.round(short * 0.04),
    clock: Math.round(short * 0.15),
    ring,
    // Sized from the ring rather than the screen, so the number always sits
    // inside its own circle whatever the screen is.
    raidNumber: Math.round(ring * 0.42),
    raidLabel: Math.round(short * 0.026),
    teamName: Math.round(short * 0.082),
    score: Math.round(short * 0.30),
    label: Math.round(short * 0.026),
    // A tap target never shrinks below what a thumb needs.
    control: Math.max(40, Math.round(short * 0.085)),
    step: Math.max(36, Math.round(short * 0.072)),
  };
}
