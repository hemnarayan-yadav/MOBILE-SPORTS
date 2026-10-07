// Ported from frontend/src/utils/matchResult.js (unchanged).
// The result of a finished match: who won, and by how much.
//
// One pure function so that every surface says the same thing — the match page,
// a card in a list, the ground display, the share text a crawler reads, and the
// phone app (which ports this file). The margin is derived rather than stored:
// the API carries the winner's id and both scores, and nothing else is needed.
//
// Returns null when there is no result to announce: a match that is not
// finished, and a finished match whose winner is missing (the lifecycle job
// completes a match that was never played, and a team can be soft-deleted
// afterwards). A tie is a result, with no winner and no margin.
export function matchResult(match) {
  if (match?.status !== 'completed') return null;
  if (match.isTie) return { isTie: true, winner: null, margin: 0 };

  const winner = [match.teamA, match.teamB].find((team) => team && team.id === match.winner);
  if (!winner) return null;

  return { isTie: false, winner, margin: Math.abs(match.teamAScore - match.teamBScore) };
}
