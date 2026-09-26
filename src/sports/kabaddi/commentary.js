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
