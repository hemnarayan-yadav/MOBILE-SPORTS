// Everything kabaddi-specific the viewer shows: commentary from the raid log,
// the live court panel, and which team and player statistics mean something.
// Shared screens reach it only through getSportUI(match.sport) (../index.js),
// so another sport (Cricket) plugs in as its own folder.
import LivePanel from './LivePanel.jsx';
import {
  buildTimeline,
  describeEvent,
  describeRaid,
  matchDirectory,
  raidPointsBySide,
} from './commentary.js';

// Rows of the head-to-head team statistics (keys of `live.teamStats` and of
// the `stats.*` translations).
const TEAM_STAT_ROWS = Object.freeze([
  'totalPoints',
  'raidPoints',
  'tacklePoints',
  'allOutPoints',
  'technicalPoints',
  'superRaids',
  'superTackles',
]);

// The short breakdown shown next to a player's total.
function playerStatLine(stats, t) {
  return `${t('stats.raidShort', { value: stats.raidPoints })} · ${t('stats.tackleShort', { value: stats.tacklePoints })}`;
}

export const kabaddiUI = Object.freeze({
  LivePanel,
  buildTimeline,
  describeEvent,
  describeRaid,
  matchDirectory,
  raidPointsBySide,
  playerStatLine,
  teamStatRows: TEAM_STAT_ROWS,
});
