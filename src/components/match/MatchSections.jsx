// The match centre's sections, adapted from frontend/src/pages/public/
// MatchDetails.jsx and RaidFeed in components/match/MatchBits.jsx. Anything
// that depends on the sport's rules comes from getSportUI(match.sport).
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { matchesApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import { teamsApi } from '../../api/teams.api.js';
import { getSportUI } from '../../sports/index.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { formatDateTime, formatTime } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import Badge from '../common/Badge.jsx';
import { Card } from '../common/Layout.jsx';
import { LoadingState } from '../common/States.jsx';
import { PlayingRoleBadge } from '../player/PlayerBits.jsx';
import TeamCrest from '../team/TeamCrest.jsx';
import MatchCard from './MatchCard.jsx';

const TOP_PERFORMERS = 3;
const SIDES = ['A', 'B'];
const teamOf = (match, side) => (side === 'A' ? match.teamA : match.teamB);

function PlayerLink({ id, children, style }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/player/${id}`)} accessibilityRole="link" style={style}>
      {children}
    </Pressable>
  );
}

function Muted({ children }) {
  return (
    <AppText tone="muted" style={styles.center}>
      {children}
    </AppText>
  );
}

// The raid-by-raid feed, newest first, in readable commentary.
export function RaidFeed({ match, timeline, directory, limit }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sport = getSportUI(match.sport);
  const items = limit ? timeline.slice(0, limit) : timeline;
  if (items.length === 0) return <Muted>{t('live.feedEmpty')}</Muted>;
  const context = { t, ...directory };
  return (
    <View style={styles.feed} accessibilityLiveRegion="polite">
      {items.map((item) => {
        const points = item.kind === 'raid' ? sport.raidPointsBySide(item.raid) : null;
        const highlight =
          item.kind === 'raid' &&
          (item.raid.superRaid || item.raid.superTackle || item.raid.allOutTeams.length > 0);
        return (
          <View
            key={item.key}
            style={[
              styles.feedItem,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderLeftColor: highlight ? colors.brand : colors.border,
              },
            ]}
          >
            <View style={styles.feedHead}>
              <AppText variant="label" tone="muted" style={styles.flex}>
                {item.kind === 'raid'
                  ? t('commentary.raidNumber', { number: item.raid.raidNumber })
                  : t(`live.event.${item.event.type}`)}
                {` · ${t('phase.half', { half: item.half })}`}
              </AppText>
              <AppText variant="label" tone="muted">
                {formatTime(item.at)}
              </AppText>
            </View>
            <AppText>
              {item.kind === 'raid'
                ? sport.describeRaid(item.raid, context)
                : sport.describeEvent(item.event, context)}
            </AppText>
            {points && (points.A > 0 || points.B > 0) ? (
              <View style={styles.chips}>
                {SIDES.map((side) =>
                  points[side] > 0 ? (
                    <Badge key={side} tone="brand">
                      {`${directory.teamShort(side)} +${points[side]}`}
                    </Badge>
                  ) : null,
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function LineupColumn({ match, side }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const team = teamOf(match, side);
  const entries = match.lineups.filter((entry) => entry.team === team?.id);
  const live = match.status === 'live' ? match.live?.teams[side] : null;
  const stateOf = (playerId) => {
    if (!live) return null;
    if (live.onCourt.includes(playerId)) return 'onCourt';
    if (live.out.includes(playerId)) return 'out';
    return 'bench';
  };
  const dot = { onCourt: colors.success, out: colors.live, bench: colors.border };

  const group = (titleKey, members) => (
    <View style={styles.group}>
      <AppText variant="label" tone="muted">
        {t(titleKey)}
      </AppText>
      {members.map((entry) => {
        const state = stateOf(entry.player.id);
        return (
          <PlayerLink key={entry.player.id} id={entry.player.id} style={styles.lineupRow}>
            <AppText variant="score" tone="brandStrong" style={styles.jersey}>
              {entry.jerseyNumber}
            </AppText>
            <AppText weight="semibold" numberOfLines={1} style={styles.flex}>
              {entry.player.name}
              {entry.isMatchCaptain ? ' (C)' : ''}
            </AppText>
            <PlayingRoleBadge role={entry.playingRole} />
            {state ? (
              <View
                style={[styles.stateDot, { backgroundColor: dot[state] }]}
                accessible
                accessibilityLabel={t(`live.playerState.${state}`)}
              />
            ) : null}
          </PlayerLink>
        );
      })}
    </View>
  );

  return (
    <Card>
      <View style={styles.teamTitle}>
        <TeamCrest team={team} size="xs" />
        <AppText weight="bold">{team?.name}</AppText>
      </View>
      {entries.length === 0 ? (
        <AppText tone="muted">{t('match.lineupNotSet')}</AppText>
      ) : (
        <>
          {group(
            'match.startingSeven',
            entries.filter((e) => e.isStartingSeven),
          )}
          {group(
            'match.substitutes',
            entries.filter((e) => !e.isStartingSeven),
          )}
        </>
      )}
    </Card>
  );
}

export function Lineups({ match }) {
  return SIDES.map((side) => <LineupColumn key={side} match={match} side={side} />);
}

// An upcoming match without announced lineups shows each team's playing seven
// (or its first seven players).
function SquadPreview({ teamId }) {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: qk.teams.detail(teamId),
    queryFn: () => teamsApi.get(teamId),
    enabled: Boolean(teamId),
  });
  if (!data) return <LoadingState />;
  const seven = data.squad.filter((member) => member.isPlayingSeven);
  const list = seven.length ? seven : data.squad.slice(0, 7);
  return (
    <Card>
      <View style={styles.teamTitle}>
        <TeamCrest team={data} size="xs" />
        <AppText weight="bold">{data.name}</AppText>
      </View>
      <AppText variant="label" tone="muted">
        {t(seven.length ? 'squad.playingSeven' : 'squad.title')}
      </AppText>
      {list.map((member) => (
        <View key={member.player.id} style={styles.lineupRow}>
          <AppText variant="score" tone="brandStrong" style={styles.jersey}>
            {member.jerseyNumber}
          </AppText>
          <AppText numberOfLines={1} style={styles.flex}>
            {member.player.name}
          </AppText>
          <PlayingRoleBadge role={member.playingRole} />
        </View>
      ))}
    </Card>
  );
}

export function Squads({ match }) {
  if (match.lineups.length > 0) return <Lineups match={match} />;
  return SIDES.map((side) => <SquadPreview key={side} teamId={teamOf(match, side)?.id} />);
}

export function TopPerformers({ match, directory }) {
  const { t } = useTranslation();
  const sport = getSportUI(match.sport);
  const stats = match.live?.playerStats ?? {};
  return SIDES.map((side) => {
    const top = Object.entries(stats)
      .filter(([, s]) => s.team === side && s.totalPoints > 0)
      .sort(([, a], [, b]) => b.totalPoints - a.totalPoints)
      .slice(0, TOP_PERFORMERS);
    return (
      <Card key={side}>
        <View style={styles.teamTitle}>
          <TeamCrest team={teamOf(match, side)} size="xs" />
          <AppText weight="bold">{directory.teamName(side)}</AppText>
        </View>
        {top.length === 0 ? (
          <AppText tone="muted">{t('match.noPointsYet')}</AppText>
        ) : (
          top.map(([playerId, s]) => (
            <PlayerLink key={playerId} id={playerId} style={styles.lineupRow}>
              <Avatar name={directory.playerName(playerId)} size="sm" />
              <View style={styles.flex}>
                <AppText weight="semibold" numberOfLines={1}>
                  {directory.playerName(playerId)}
                </AppText>
                <AppText variant="small" tone="muted">
                  {sport.playerStatLine(s, t)}
                </AppText>
              </View>
              <AppText variant="score">{s.totalPoints}</AppText>
            </PlayerLink>
          ))
        )}
      </Card>
    );
  });
}

// Each team's share of a statistic, as two bars meeting in the middle.
export function TeamStatsCompare({ match }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const teamStats = match.live?.teamStats;
  if (!teamStats) return null;
  const rows = getSportUI(match.sport).teamStatRows;
  return (
    <Card>
      <View style={styles.compareHead}>
        <AppText weight="bold">{match.teamA?.shortName}</AppText>
        <AppText weight="bold">{match.teamB?.shortName}</AppText>
      </View>
      {rows.map((key) => {
        const a = teamStats.A[key];
        const b = teamStats.B[key];
        const total = a + b || 1;
        return (
          <View
            key={key}
            style={styles.compareRow}
            accessible
            accessibilityLabel={`${t(`stats.${key}`)}: ${match.teamA?.shortName} ${a}, ${match.teamB?.shortName} ${b}`}
          >
            <View style={styles.compareLabels}>
              <AppText weight="bold">{a}</AppText>
              <AppText variant="small" tone="muted">
                {t(`stats.${key}`)}
              </AppText>
              <AppText weight="bold">{b}</AppText>
            </View>
            <View style={styles.bars}>
              <View style={[styles.barTrack, styles.barLeft, { backgroundColor: colors.surface2 }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(a / total) * 100}%`, backgroundColor: colors.brand },
                  ]}
                />
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.surface2 }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(b / total) * 100}%`, backgroundColor: colors.info },
                  ]}
                />
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export function MvpCard({ match }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!match.mvp) return null;
  const stats = match.live?.playerStats?.[match.mvp.id];
  return (
    <PlayerLink id={match.mvp.id} style={[styles.mvp, { backgroundColor: colors.ink }]}>
      <Avatar src={match.mvp.photoUrl} name={match.mvp.name} size="lg" />
      <View style={styles.flex}>
        <Badge tone="brand">{t('match.mvp')}</Badge>
        <AppText variant="title" display tone="onInk" numberOfLines={1}>
          {match.mvp.name}
        </AppText>
        {stats ? (
          <AppText variant="small" tone="onInk">
            {t('match.mvpLine', {
              total: stats.totalPoints,
              raid: stats.raidPoints,
              tackle: stats.tacklePoints,
            })}
          </AppText>
        ) : null}
      </View>
    </PlayerLink>
  );
}

export function HeadToHead({ match }) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: qk.matches.headToHead(match.teamA?.id, match.teamB?.id),
    queryFn: () => matchesApi.headToHead(match.teamA.id, match.teamB.id),
    enabled: Boolean(match.teamA && match.teamB),
  });
  if (!query.data) return <LoadingState />;
  const { played, winsA, winsB, ties, matches } = query.data;
  const wins = (teamId) => (teamId === match.teamA.id ? winsA : winsB);
  const tiles = [
    [match.teamA.shortName, wins(match.teamA.id)],
    [t('match.ties'), ties],
    [match.teamB.shortName, wins(match.teamB.id)],
  ];
  return (
    <>
      <View style={styles.h2h}>
        {tiles.map(([label, value]) => (
          <Card key={label} style={styles.h2hTile}>
            <AppText variant="score" style={styles.center}>
              {value}
            </AppText>
            <AppText variant="small" tone="muted" style={styles.center}>
              {label}
            </AppText>
          </Card>
        ))}
      </View>
      {played === 0 ? (
        <Muted>{t('match.noHeadToHead')}</Muted>
      ) : (
        matches.map((item) => <MatchCard key={item.id} match={item} />)
      )}
    </>
  );
}

export function MatchInfo({ match }) {
  const { t } = useTranslation();
  const tossTeam = match.tossWinner
    ? match.tossWinner === match.teamA?.id
      ? match.teamA
      : match.teamB
    : null;
  const rows = [
    ['match.kickoff', formatDateTime(match.scheduledAt)],
    ['match.venue', match.venue ?? '—'],
    [
      'match.toss',
      tossTeam
        ? t('match.tossResult', {
            team: tossTeam.name,
            decision: t(`match.tossDecision.${match.tossDecision}`),
          })
        : '—',
    ],
  ];
  return (
    <Card>
      {rows.map(([key, value]) => (
        <View key={key} style={styles.infoRow}>
          <AppText variant="label" tone="muted">
            {t(key)}
          </AppText>
          <AppText weight="semibold">{value}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  feed: { gap: SPACING.sm },
  feedItem: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: RADII.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  feedHead: { flexDirection: 'row', gap: SPACING.sm },
  chips: { flexDirection: 'row', gap: SPACING.xs },
  group: { gap: SPACING.xs },
  teamTitle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  lineupRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 40 },
  jersey: { width: 32, textAlign: 'center' },
  stateDot: { width: 10, height: 10, borderRadius: 5 },
  compareHead: { flexDirection: 'row', justifyContent: 'space-between' },
  compareRow: { gap: 4 },
  compareLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bars: { flexDirection: 'row', gap: 4, height: 8 },
  barTrack: { flex: 1, borderRadius: 4, overflow: 'hidden' },
  barLeft: { flexDirection: 'row', justifyContent: 'flex-end' },
  barFill: { height: '100%', borderRadius: 4 },
  mvp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADII.xxl,
  },
  h2h: { flexDirection: 'row', gap: SPACING.sm },
  h2hTile: { flex: 1, alignItems: 'center' },
  infoRow: { gap: 2 },
});
