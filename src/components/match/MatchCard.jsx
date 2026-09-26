// Adapted from MatchCard in frontend/src/components/match/MatchBits.jsx: every
// status, team crests, and the running clock ticked against the match's own
// half length (B8: summaries carry `rules`).
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { MATCH_STATUS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';
import Badge, { StatusBadge } from '../common/Badge.jsx';
import TeamCrest from '../team/TeamCrest.jsx';
import MatchClock from './MatchClock.jsx';

const DEFAULT_HALF_SECONDS = 20 * 60;

export function phaseKey(phase) {
  if (!phase) return null;
  return phase === 'first_half' || phase === 'second_half' ? 'phase.half' : `phase.${phase}`;
}

// Length of the half being played, from the match's rules (a summary from an
// older server has none: the default then applies, as before).
export function halfSecondsOf(match) {
  const rules = match.rules ?? match.live?.rules;
  const seconds =
    match.half === 2 ? rules?.secondHalfDurationSeconds : rules?.firstHalfDurationSeconds;
  return seconds ?? DEFAULT_HALF_SECONDS;
}

export function MatchStatusBadge({ match }) {
  const { t } = useTranslation();
  return match.status === MATCH_STATUS.LIVE ? (
    <Badge tone="live">{t('match.live')}</Badge>
  ) : (
    <StatusBadge status={match.status} />
  );
}

function ScoreLine({ team, score, showScore, winner }) {
  return (
    <View style={styles.scoreLine}>
      <TeamCrest team={team} size="sm" />
      <AppText weight={winner ? 'bold' : 'semibold'} numberOfLines={1} style={styles.flex}>
        {team?.name}
      </AppText>
      {showScore ? (
        <AppText variant="score" tone={winner ? 'text' : 'muted'}>
          {score}
        </AppText>
      ) : null}
    </View>
  );
}

function Footer({ match }) {
  const { t } = useTranslation();
  if (match.status === MATCH_STATUS.LIVE) {
    const phase = phaseKey(match.phase);
    return (
      <View style={styles.footerRow}>
        {phase ? (
          <AppText variant="small" tone="muted">
            {t(phase, { half: match.half })}
          </AppText>
        ) : null}
        {match.clock ? <MatchClock clock={match.clock} halfSeconds={halfSecondsOf(match)} /> : null}
      </View>
    );
  }
  const text =
    match.status === MATCH_STATUS.COMPLETED
      ? t(match.isTie ? 'match.tie' : 'match.fullTime')
      : formatDateTime(match.scheduledAt);
  return (
    <AppText variant="small" tone="muted">
      {text}
    </AppText>
  );
}

export default function MatchCard({ match }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const live = match.status === MATCH_STATUS.LIVE;
  const completed = match.status === MATCH_STATUS.COMPLETED;
  const showScore = live || completed;
  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: live ? colors.liveBorder : colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="label" tone="muted" numberOfLines={1} style={styles.flex}>
          {match.tournament?.name ?? t('match.friendly')}
          {match.round ? ` · ${match.round}` : ''}
        </AppText>
        <MatchStatusBadge match={match} />
      </View>
      <ScoreLine
        team={match.teamA}
        score={match.teamAScore}
        showScore={showScore}
        winner={completed && match.winner === match.teamA?.id}
      />
      <ScoreLine
        team={match.teamB}
        score={match.teamBScore}
        showScore={showScore}
        winner={completed && match.winner === match.teamB?.id}
      />
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Footer match={match} />
        {match.venue ? (
          <AppText variant="small" tone="muted" numberOfLines={1} style={styles.venue}>
            {match.venue}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1 },
  scoreLine: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  venue: { flexShrink: 1, textAlign: 'right' },
});
