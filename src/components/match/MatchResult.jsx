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
    return (
      <Animated.View
        style={[styles.band, { backgroundColor: colors.surface, borderColor: colors.border }, settle]}
      >
        <AppText variant="title" display>
          {t('match.tie')}
        </AppText>
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

// The margin, for a card or a row in a list: the winner's name is already the
// bold one beside it, so this only has to say by how much.
export function WinMargin({ match }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const result = matchResult(match);
  if (!result || result.isTie) return null;
  return (
    <View style={styles.line}>
      <Ionicons name="trophy" size={13} color={colors.goldStrong} />
      <AppText variant="small" weight="semibold" numberOfLines={1} style={{ color: colors.goldStrong }}>
        {t('match.wonByMargin', { count: result.margin })}
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
  cup: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  flex: { flex: 1 },
});
