// Ported from frontend/src/utils/tieBreak.js (unchanged).
//
// Everything below this header is the web file byte for byte; `npm run drift`
// reports when the web source has changed. `tieBreakFromLive` belongs to the
// ground's big display, which this app has no counterpart for; it is kept so the
// two copies stay one file rather than two that have drifted on purpose.
// The five-raid tie-breaker a level match may have been decided by.
//
// Deliberately beside `matchResult()` rather than inside it: the match was
// tied and stays tied, so the result every surface already reads is unchanged
// and this is the extra line next to it — which is also how the Pro Kabaddi
// League announces one ("A tied with B (34-34) · B wins Five Raids 6-4").
//
// Two readings of the same thing, because the ground's big display has two
// sources: the finished match document, and — on the controller's own laptop,
// where the console feeds the board directly — the live state.
//
// Both return null when there is nothing to announce: a match that was never
// given a tie-breaker, one nobody finished, and one whose winning team has
// since been soft-deleted.

function announce(winner, { won, lost, scoreA, scoreB }) {
  if (!winner) return null;
  return { winner, won, lost, scoreA, scoreB };
}

/** From the finished match, as the API serializes it. */
export function tieBreakResult(match) {
  const tieBreak = match?.tieBreak;
  if (!tieBreak?.winner) return null;
  const winner = [match.teamA, match.teamB].find((team) => team && team.id === tieBreak.winner);
  const home = winner?.id === match.teamA?.id;
  return announce(winner, {
    won: home ? tieBreak.teamAScore : tieBreak.teamBScore,
    lost: home ? tieBreak.teamBScore : tieBreak.teamAScore,
    scoreA: tieBreak.teamAScore,
    scoreB: tieBreak.teamBScore,
  });
}

/** From the live snapshot, which works in sides rather than team ids. */
export function tieBreakFromLive(live, match) {
  const tieBreak = live?.tieBreak;
  if (!tieBreak?.winner) return null;
  const home = tieBreak.winner === 'A';
  const { A, B } = tieBreak.score;
  return announce(home ? match?.teamA : match?.teamB, {
    won: home ? A : B,
    lost: home ? B : A,
    scoreA: A,
    scoreB: B,
  });
}
