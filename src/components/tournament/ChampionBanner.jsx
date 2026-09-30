// Adapted from frontend/src/components/tournament/ChampionBanner.jsx: the same
// result, the same rule about when it renders. The web animates the cup and
// sweeps a light across the card; the app settles the cup in with the layout
// animation the platform already runs and leaves it there, so nothing loops on
// a screen a phone keeps awake.
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import TeamCrest from '../team/TeamCrest.jsx';

export default function ChampionBanner({ tournament }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { champion, playerOfTournament } = tournament;
  // A completed tournament that produced no result simply shows nothing.
  if (!champion && !playerOfTournament) return null;

  return (
    <View
      accessibilityLabel={t('tournament.championTitle')}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.gold }]}
    >
      {champion ? (
        <Pressable
          onPress={() => router.push(`/team/${champion.id}`)}
          accessibilityRole="button"
          style={styles.row}
        >
          <View style={[styles.cup, { backgroundColor: colors.brandSoft }]}>
            <Ionicons name="trophy" size={26} color={colors.goldStrong} />
          </View>
          <View style={styles.flex}>
            <AppText variant="label" style={{ color: colors.goldStrong }}>
              {t('tournament.championTitle')}
            </AppText>
            <View style={styles.teamRow}>
              <TeamCrest team={champion} size="sm" />
              <AppText variant="title" display numberOfLines={1} style={styles.flex}>
                {champion.name}
              </AppText>
            </View>
          </View>
        </Pressable>
      ) : null}

      {playerOfTournament ? (
        <Pressable
          onPress={() => router.push(`/player/${playerOfTournament.id}`)}
          accessibilityRole="button"
          style={[styles.row, styles.player, { borderTopColor: colors.border }]}
        >
          <Avatar src={playerOfTournament.photoUrl} name={playerOfTournament.name} size="sm" />
          <View style={styles.flex}>
            <AppText variant="label" tone="muted">
              {t('tournament.playerOfTournament')}
            </AppText>
            <AppText weight="semibold" numberOfLines={1}>
              {playerOfTournament.name}
            </AppText>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

// The same result, one line, for a tournament card in a list.
export function ChampionLine({ champion }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!champion) return null;
  return (
    <View style={styles.line}>
      <Ionicons name="trophy" size={14} color={colors.goldStrong} />
      <AppText
        variant="small"
        weight="semibold"
        numberOfLines={1}
        style={{ color: colors.goldStrong }}
      >
        {t('tournament.championNamed', { team: champion.name })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  player: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACING.md },
  cup: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
});
