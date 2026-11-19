// Ported from frontend/src/sports/kabaddi/commentary.js (unchanged).
//
// Readable, localized commentary generated from the structured raid log.
// Pure functions: callers pass `t` and name resolvers.

const other = (side) => (side === 'A' ? 'B' : 'A');

export function buildTimeline(live) {
  if (!live) return [];
  const raids = live.raids.map((raid) => ({
    kind: 'raid',
    key: `raid-${raid.raidNumber}`,
    at: raid.at,
    half: raid.half,
    raid,
  }));
  const events = live.events
    .filter((event) => event.type !== 'all_out')
    .map((event, index) => ({
      kind: 'event',
      key: `event-${index}-${event.type}`,
      at: event.at,
      half: event.half,
      event,
    }));
  return [...raids, ...events].sort((a, b) => new Date(b.at) - new Date(a.at));
}

function raidSentence(raid, { t, playerName, teamName }) {
  const raider = playerName(raid.raider);
  if (raid.outcome === 'tackled') {
    const tacklers = raid.tacklers.map(playerName).join(', ') || teamName(other(raid.raidingTeam));
    const key = raid.superTackle ? 'commentary.superTackle' : 'commentary.tackled';
    return t(key, { raider, tacklers });
  }
  // The raider walked out of play. Scored like a tackle nobody made, so it is
  // neither an empty raid (which is what it used to be called here) nor a
  // tackle: the defence takes the point and the raider is out.
  if (raid.outcome === 'self_out') {
    return t('commentary.raiderSelfOut', { raider });
  }
  if (raid.outcome === 'successful') {
    if (raid.touchPoints > 0 && raid.bonusPoint)
      return t('commentary.touchBonus', { raider, count: raid.touchPoints });
    if (raid.touchPoints > 0) return t('commentary.touch', { raider, count: raid.touchPoints });
    return t('commentary.bonus', { raider });
  }
  return t(raid.isDoOrDie ? 'commentary.doOrDieFail' : 'commentary.empty', { raider });
}

export function describeRaid(raid, context) {
  const { t, teamName } = context;
  const parts = [];
  if (raid.isDoOrDie) parts.push(t('commentary.doOrDieTag'));
  parts.push(raidSentence(raid, context));
  if (raid.superRaid) parts.push(t('commentary.superRaid'));
  raid.allOutTeams.forEach((side) => parts.push(t('commentary.allOut', { team: teamName(side) })));
  return parts.join(' ');
}

export function describeEvent(event, { t, playerName, teamName }) {
  const team = teamName(event.team);
  switch (event.type) {
    case 'technical_point':
      // A raid-delay penalty is the one technical point the engine awards by
      // itself, so it is worth naming rather than reporting as "technical".
      return event.reason === 'raid_delay'
        ? t('commentary.raidDelayPoint', { team, count: event.points ?? 1 })
        : t('commentary.technicalPoint', { team });
    case 'timeout':
      return t('commentary.timeout', { team });
    case 'substitution':
      return t('commentary.substitution', {
        team,
        playerIn: playerName(event.playerIn),
        playerOut: playerName(event.playerOut),
      });
    case 'injury':
      return t('commentary.injury', { team, player: playerName(event.player) });
    // A player walks out of play outside a raid's own outcome — a defender, or
    // anyone while no raid is on. The other side takes the point.
    case 'self_out':
      return t('commentary.selfOut', {
        team,
        player: playerName(event.player),
        opponent: teamName(event.pointsTo),
        count: event.points ?? 1,
      });
    // The controller's two corrections. They score nothing, so the feed says
    // plainly what was changed and by whom.
    case 'raid_cancelled':
      return t('commentary.raidCancelled');
    case 'next_raid_override':
      return t('commentary.nextRaidOverride', { team });
    default:
      return '';
  }
}

// Points each side gained from a raid (for score chips in the feed).
export function raidPointsBySide(raid) {
  const points = { A: 0, B: 0 };
  points[raid.raidingTeam] += raid.raidPoints;
  points[other(raid.raidingTeam)] += raid.defendingPoints;
  raid.allOutTeams.forEach((side) => {
    points[other(side)] += 2;
  });
  return points;
}

// Resolves player ids to names and team sides to team names from a match detail.
// A player who has not scored still played, so their line reads as zeros
// rather than being missing. Every counter the engine keeps is here, so a stat
// line can read any of them without guarding for undefined.
const NO_POINTS = Object.freeze({
  raids: 0,
  successfulRaids: 0,
  unsuccessfulRaids: 0,
  emptyRaids: 0,
  doOrDieRaids: 0,
  raidPoints: 0,
  touchPoints: 0,
  bonusPoints: 0,
  superRaids: 0,
  tacklePoints: 0,
  successfulTackles: 0,
  superTackles: 0,
  timesTouchedOut: 0,
  totalPoints: 0,
});

/**
 * One side's whole team, with what each player scored.
 *
 * **Everybody in the lineup is listed, scorers and non-scorers alike** — a
 * summary that shows only the players who scored reads as though the rest did
 * not play, which is not what a team sheet is for.
 *
 * Ordered by points, then by jersey number: the scorers come first, and the
 * rest keep the order a reader already knows from the lineup rather than
 * shuffling between visits.
 *
 * A player with points but no lineup entry is kept, at the end. The lineup is a
 * snapshot taken at setup, so it can disagree with a match that has already
 * been played; dropping somebody who actually scored would be the worse of the
 * two mistakes.
 */
export function matchScorers(match, side) {
  const stats = match?.live?.playerStats ?? {};
  const teamId = (side === 'A' ? match?.teamA : match?.teamB)?.id;
  const lineup = (match?.lineups ?? []).filter((entry) => entry.team === teamId);
  const listed = new Set(lineup.map((entry) => entry.player.id));
  const rows = lineup.map((entry) => ({
    playerId: entry.player.id,
    jersey: Number(entry.jerseyNumber) || 0,
    stats: stats[entry.player.id] ?? NO_POINTS,
  }));
  for (const [playerId, playerStats] of Object.entries(stats)) {
    if (playerStats.team === side && !listed.has(playerId)) {
      rows.push({ playerId, jersey: Number.MAX_SAFE_INTEGER, stats: playerStats });
    }
  }
  rows.sort((a, b) => b.stats.totalPoints - a.stats.totalPoints || a.jersey - b.jersey);
  return rows;
}

export function matchDirectory(match) {
  const players = new Map((match?.lineups ?? []).map((entry) => [entry.player.id, entry]));
  const sideTeam = { A: match?.teamA, B: match?.teamB };
  return {
    playerName: (id) => players.get(id)?.player.name ?? '—',
    jersey: (id) => players.get(id)?.jerseyNumber,
    teamName: (side) => sideTeam[side]?.name ?? side,
    teamShort: (side) => sideTeam[side]?.shortName ?? side,
    entry: (id) => players.get(id),
  };
}
