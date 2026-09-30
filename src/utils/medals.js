// Adapted from frontend/src/utils/medals.js: the thresholds, `medalOf` and
// `isHighlighted` are the web's, unchanged. `rankTone` is not — the web returns
// Tailwind class names and the app returns theme tokens, so each platform paints
// the podium its own way while agreeing on who is on it.

export const PODIUM = 3;
export const TOP_TEN = 10;

const MEDALS = Object.freeze({ 1: 'gold', 2: 'silver', 3: 'bronze' });

export const medalOf = (rank) => MEDALS[rank] ?? null;

// Ranks 4–10: off the podium, still at the top of the table.
export const isHighlighted = (rank) => rank > PODIUM && rank <= TOP_TEN;

// A style cannot mix colours in React Native the way `bg-gold/10` does, so the
// rim and the row tint are the medal at a low opacity, built once here instead
// of at each call site.
const RIM_ALPHA = 0.4;
const ROW_ALPHA = 0.12;
const fade = (color, alpha) => color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);

// What one rank looks like: the badge fill and the `AppText` tone that is
// readable on it, the badge's rim, and the tint of the row it sits in. The
// podium has to out-rank the 4–10 band, not be out-shouted by it.
export function rankTone(rank, colors) {
  const medal = medalOf(rank);
  if (medal) {
    return {
      badge: colors[medal],
      badgeTone: 'ink',
      rim: fade(colors[medal], RIM_ALPHA),
      row: fade(colors[medal], ROW_ALPHA),
    };
  }
  return {
    badge: colors.surface2,
    badgeTone: 'muted',
    rim: 'transparent',
    row: isHighlighted(rank) ? colors.brandSoft : 'transparent',
  };
}
