// Adapted from frontend/src/components/match/ScoreBoard.jsx: the broadcast-
// style scoreboard at the top of the match centre. The sport's own live panel
// (court, next raid, raid clock) comes from getSportUI.
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getSportUI } from '../../sports/index.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { MATCH_STATUS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';
import Countdown from '../common/Countdown.jsx';
import TeamCrest from '../team/TeamCrest.jsx';
import { MatchStatusBadge, halfSecondsOf, phaseKey } from './MatchCard.jsx';
import MatchClock from './MatchClock.jsx';

function TeamColumn({ team }) {
  const router = useRouter();
  const content = (
    <>
      <TeamCrest team={team} size="lg" />
      <AppText weight="bold" display tone="onInk" numberOfLines={2} style={styles.teamName}>
        {team?.name}
      </AppText>
    </>
  );
  // A match always has both teams; if one is ever missing it is shown, not linked.
  return team ? (
    <Pressable
      onPress={() => router.push(`/team/${team.id}`)}
      accessibilityRole="link"
      style={styles.team}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.team}>{content}</View>
  );
}

export default function ScoreBoard({ match, directory }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { LivePanel } = getSportUI(match.sport);
  const { live } = match;
  const isLive = match.status === MATCH_STATUS.LIVE && live;
  const showScore = match.status === MATCH_STATUS.LIVE || match.status === MATCH_STATUS.COMPLETED;

  return (
    <View style={[styles.board, { backgroundColor: colors.ink }]}>
      <View style={styles.head}>
        <Pressable
          disabled={!match.tournament}
          onPress={() => router.push(`/tournament/${match.tournament.id}`)}
          style={styles.flex}
        >
          <AppText variant="label" tone="onInk" numberOfLines={1}>
            {match.tournament?.name ?? t('match.friendly')}
            {match.round ? ` · ${match.round}` : ''}
          </AppText>
        </Pressable>
        <MatchStatusBadge match={match} />
      </View>

      <View style={styles.teams}>
        <TeamColumn team={match.teamA} />
        <View style={styles.center}>
          {showScore ? (
            <View
              style={styles.score}
              accessible
              accessibilityLabel={`${match.teamA?.name} ${match.teamAScore}, ${match.teamB?.name} ${match.teamBScore}`}
            >
              <AppText variant="bigScore" tone="onInk">
                {match.teamAScore}
              </AppText>
              <AppText variant="score" tone="onInk" style={styles.colon}>
                :
              </AppText>
              <AppText variant="bigScore" tone="onInk">
                {match.teamBScore}
              </AppText>
            </View>
          ) : (
            <AppText variant="heading" tone="onInk" style={styles.vs}>
              {t('match.vs')}
            </AppText>
          )}
          {isLive ? (
            <>
              <MatchClock
                clock={live.clock}
                halfSeconds={live.rules?.halfDurationSeconds ?? halfSecondsOf(match)}
                variant="score"
                tone="onInk"
              />
              {phaseKey(live.phase) ? (
                <AppText variant="small" tone="onInk">
                  {t(phaseKey(live.phase), { half: live.half })}
                </AppText>
              ) : null}
            </>
          ) : null}
          {match.status === MATCH_STATUS.COMPLETED ? (
            <AppText variant="small" weight="semibold" tone="onInk">
              {t(match.isTie ? 'match.tie' : 'match.fullTime')}
            </AppText>
          ) : null}
        </View>
        <TeamColumn team={match.teamB} />
      </View>

      {isLive ? <LivePanel match={match} live={live} directory={directory} /> : null}

      {match.status === MATCH_STATUS.UPCOMING ? (
        <View style={styles.upcoming}>
          <Countdown to={match.scheduledAt} />
          <AppText variant="small" tone="onInk" style={styles.centerText}>
            {formatDateTime(match.scheduledAt)}
          </AppText>
        </View>
      ) : null}
      {match.status === MATCH_STATUS.CANCELLED ? (
        <AppText tone="onInk" style={styles.centerText}>
          {match.cancelReason ?? t('match.cancelledNotice')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { padding: SPACING.lg, gap: SPACING.lg, borderRadius: RADII.xxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1 },
  teams: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  team: { flex: 1, alignItems: 'center', gap: SPACING.sm },
  teamName: { textAlign: 'center', fontSize: 18, lineHeight: 21 },
  center: { alignItems: 'center', minWidth: 110, gap: 2 },
  score: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  colon: { opacity: 0.5 },
  vs: { opacity: 0.7, marginTop: SPACING.md },
  upcoming: { gap: SPACING.sm },
  centerText: { textAlign: 'center' },
});
