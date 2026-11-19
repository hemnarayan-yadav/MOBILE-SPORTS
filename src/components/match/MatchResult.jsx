// Adapted from the result band and WinMargin in
// frontend/src/components/match/ScoreBoard.jsx and MatchBits.jsx: the same
// result, from the same ported `matchResult`, in the same words.
//
// The web sweeps a light across the band and keeps it sweeping. This follows
// the rule ChampionBanner already set here: the cup and the band settle in once
// and then stay put, so nothing loops on a screen a phone is keeping awake.
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { matchResult } from '../../utils/matchResult.js';
import { tieBreakResult } from '../../utils/tieBreak.js';
import AppText from '../common/AppText.jsx';
import TeamCrest from '../team/TeamCrest.jsx';

// One pass on mount: fades up and settles. Native-driven, so it does not touch
// the JS thread while a list is being scrolled.
function useSettleIn() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);
  return {
    opacity: progress,
    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
  };
}

// The result of a finished match, for the match screen: who won and by how much.
export function MatchResultBand({ match }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const settle = useSettleIn();
  const result = matchResult(match);
  if (!result) return null;

  if (result.isTie) {
    // A tied match may still have been decided by five raids each. The tie is
    // what the match was played to and is said first; the tie-breaker names the
    // side that goes through, exactly as the web and the ground display do.
    const tieBreak = tieBreakResult(match);
    return (
      <Animated.View
        style={[
          styles.band,
          styles.tieBand,
          { backgroundColor: colors.surface, borderColor: tieBreak ? colors.gold : colors.border },
          settle,
        ]}
      >
        <AppText variant="title" display>
          {t('match.tie')}
        </AppText>
        {tieBreak ? (
          <View style={styles.line}>
            <Ionicons name="trophy" size={14} color={colors.goldStrong} />
            <AppText
              variant="small"
              weight="semibold"
              numberOfLines={2}
              style={{ color: colors.goldStrong }}
            >
              {t('match.tieBreakWonBy', {
                team: tieBreak.winner.name,
                won: tieBreak.won,
                lost: tieBreak.lost,
              })}
            </AppText>
          </View>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      accessibilityLabel={t('match.winnerLabel')}
      style={[styles.band, { backgroundColor: colors.surface, borderColor: colors.gold }, settle]}
    >
      <View style={[styles.cup, { backgroundColor: colors.brandSoft }]}>
        <Ionicons name="trophy" size={24} color={colors.goldStrong} />
      </View>
      <View style={styles.flex}>
        <AppText variant="label" style={{ color: colors.goldStrong }}>
          {t('match.winnerLabel')}
        </AppText>
        <View style={styles.teamRow}>
          <TeamCrest team={result.winner} size="sm" />
          <AppText variant="title" display numberOfLines={2} style={styles.flex}>
            {t('match.wonBy', { team: result.winner.name, count: result.margin })}
          </AppText>
        </View>
      </View>
    </Animated.View>
  );
}

// The gold line for a card or a row in a list: the margin for a match that was
// won, and the five raids for a tie they decided. A won match has the winner's
// name in bold beside it, so this only has to say by how much; a tie has no
// bold name, so the tie-breaker names the side that goes through itself.
export function WinMargin({ match }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const result = matchResult(match);
  if (!result) return null;
  const tieBreak = result.isTie ? tieBreakResult(match) : null;
  if (result.isTie && !tieBreak) return null;
  return (
    <View style={styles.line}>
      <Ionicons name="trophy" size={13} color={colors.goldStrong} />
      <AppText
        variant="small"
        weight="semibold"
        numberOfLines={2}
        style={[styles.flex, { color: colors.goldStrong }]}
      >
        {tieBreak
          ? t('match.tieBreakWonBy', { team: tieBreak.winner.name, won: tieBreak.won, lost: tieBreak.lost })
          : t('match.wonByMargin', { count: result.margin })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADII.xxl,
    padding: SPACING.md,
  },
  // The tie band stacks rather than sitting in a row: the tie is the headline
  // and the five raids are the line under it.
  tieBand: { flexDirection: 'column', alignItems: 'center', gap: SPACING.xs },
  cup: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  flex: { flex: 1 },
});
