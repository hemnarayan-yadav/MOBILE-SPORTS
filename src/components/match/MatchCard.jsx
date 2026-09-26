// Adapted from MatchCard in frontend/src/components/match/MatchBits.jsx — the
// live card only for now (Home lists live matches). Team crests, the other
// statuses and navigation to the match centre arrive with Phase M2.
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { MATCH_STATUS } from '../../utils/constants.js';
import AppText from '../common/AppText.jsx';
import MatchClock from './MatchClock.jsx';

export function phaseKey(phase) {
  if (!phase) return null;
  return phase === 'first_half' || phase === 'second_half' ? 'phase.half' : `phase.${phase}`;
}

function ScoreLine({ team, score }) {
  return (
    <View style={styles.scoreLine}>
      <AppText weight="semibold" numberOfLines={1} style={styles.teamName}>
        {team?.name}
      </AppText>
      <AppText variant="score">{score}</AppText>
    </View>
  );
}

function LiveBadge() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.live }]}>
      <AppText variant="label" weight="bold" tone="onLive">
        {t('match.live')}
      </AppText>
    </View>
  );
}

export default function MatchCard({ match }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const live = match.status === MATCH_STATUS.LIVE;
  const phase = phaseKey(match.phase);
  return (
    <View
      accessible
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: live ? colors.liveBorder : colors.border },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="label" tone="muted" numberOfLines={1} style={styles.flex}>
          {match.tournament?.name ?? t('match.friendly')}
          {match.round ? ` · ${match.round}` : ''}
        </AppText>
        {live ? <LiveBadge /> : null}
      </View>
      <ScoreLine team={match.teamA} score={match.teamAScore} />
      <ScoreLine team={match.teamB} score={match.teamBScore} />
      {live && phase ? (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <AppText variant="small" tone="muted">
            {t(phase, { half: match.half })}
          </AppText>
          {match.clock ? <MatchClock clock={match.clock} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1 },
  scoreLine: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  teamName: { flex: 1 },
  badge: { borderRadius: RADII.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
});
