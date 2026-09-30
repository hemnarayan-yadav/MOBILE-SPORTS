// Adapted from frontend/src/utils/rounds.js: `roundName` and `isKnockoutRound`
// are the web's, unchanged. `roundTone` is not — the web returns Tailwind class
// names and the app returns theme-token colours, so each platform styles the
// knockout rounds its own way while agreeing on which rounds they are and what
// they are called.
import { KNOCKOUT_ROUNDS, MATCH_ROUNDS, ROUND_OTHER } from './constants.js';

export function roundName(match, t) {
  const round = match?.round;
  if (!round) return null;
  if (round === ROUND_OTHER) return match.roundLabel;
  // A round this build does not know is shown as it came, never as a raw
  // translation key: a match written before the rounds became a fixed list
  // still reads correctly until the migration has run.
  return MATCH_ROUNDS.includes(round) ? t(`round.${round}`) : round;
}

export const isKnockoutRound = (round) => KNOCKOUT_ROUNDS.includes(round);

// Gold for the final, silver for the semi, bronze for the quarter — the same
// order the ranking podium uses. Everything else keeps the plain card.
const TONE_TOKENS = Object.freeze({
  final: 'gold',
  semi_final: 'silver',
  quarter_final: 'bronze',
});

// `color` writes the round's name, so it is the `Strong` half of the medal, not
// the fill: the fills are bright by design and none of them is readable as small
// text on a light surface (gold managed 2.8:1 against white). The border keeps
// the fill, which is what it is for.
export function roundTone(round, colors) {
  const token = TONE_TOKENS[round];
  if (!token) return null;
  return { color: colors[`${token}Strong`], border: colors[token] };
}
