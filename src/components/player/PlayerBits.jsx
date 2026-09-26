// Adapted from frontend/src/components/player/PlayerBits.jsx, plus the points
// bars that replace the web's chart (no chart library in the app).
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { formatDate, formatNumber } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import { Card, StatTile, TileGrid } from '../common/Layout.jsx';

// Role colour tokens, as on the web.
const ROLE_TOKENS = Object.freeze({
  raider: 'raider',
  defender: 'defender',
  all_rounder: 'allrounder',
});
const CHART_MATCHES = 10;
const BAR_HEIGHT = 120;

export function PlayingRoleBadge({ role }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const color = colors[ROLE_TOKENS[role]];
  if (!color) return null;
  return (
    <View style={[styles.role, { borderColor: color }]}>
      <AppText variant="label" weight="semibold" style={{ color }}>
        {t(`playingRole.${role}`)}
      </AppText>
    </View>
  );
}

// A squad member: jersey, photo, name, role.
export function PlayerCard({ member }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { player, jerseyNumber, playingRole, isPlayingSeven } = member;
  return (
    <Pressable
      onPress={() => router.push(`/player/${player.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <Card style={styles.playerCard}>
        <Avatar src={player.photoUrl} name={player.name} size="md" />
        <View style={styles.flex}>
          <AppText variant="small" weight="bold" tone="brandStrong">
            #{jerseyNumber}
          </AppText>
          <AppText weight="semibold" numberOfLines={1}>
            {player.name}
          </AppText>
          <View style={styles.badges}>
            <PlayingRoleBadge role={playingRole} />
            {isPlayingSeven ? (
              <AppText variant="label" tone="brandStrong">
                ★ {t('squad.playingSevenShort')}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export function CareerStats({ stats = {} }) {
  const { t } = useTranslation();
  const tiles = [
    'matches',
    'totalPoints',
    'raidPoints',
    'tacklePoints',
    'superRaids',
    'superTackles',
  ];
  return (
    <TileGrid>
      {tiles.map((key) => (
        <StatTile key={key} label={t(`stats.${key}`)} value={formatNumber(stats[key] ?? 0)} />
      ))}
    </TileGrid>
  );
}

// Raid (bottom) and tackle (top) points per recent match, oldest first — the
// web's stacked bar chart drawn with plain views.
export function PointsBars({ matches }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const data = [...matches].slice(0, CHART_MATCHES).reverse();
  const max = Math.max(1, ...data.map((m) => m.raidPoints + m.tacklePoints));
  return (
    <Card>
      <AppText variant="label" tone="muted">
        {t('app.recentPoints', { count: data.length })}
      </AppText>
      <View style={styles.chart}>
        {data.map((m) => (
          <View
            key={m.matchId}
            style={styles.column}
            accessible
            accessibilityLabel={`${formatDate(m.playedAt)}: ${t('stats.raidPoints')} ${m.raidPoints}, ${t('stats.tacklePoints')} ${m.tacklePoints}`}
          >
            <View style={styles.stack}>
              <View
                style={{
                  height: (m.tacklePoints / max) * BAR_HEIGHT,
                  backgroundColor: colors.defender,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
              <View
                style={{
                  height: (m.raidPoints / max) * BAR_HEIGHT,
                  backgroundColor: colors.raider,
                }}
              />
            </View>
            <AppText variant="label" tone="muted">
              {m.totalPoints}
            </AppText>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {[
          ['raider', 'stats.raidPoints'],
          ['defender', 'stats.tacklePoints'],
        ].map(([role, key]) => (
          <View key={role} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: colors[role] }]} />
            <AppText variant="small" tone="muted">
              {t(key)}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  role: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADII.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
  },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: 2 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.xs,
    height: BAR_HEIGHT + 22,
  },
  column: { flex: 1, alignItems: 'center', gap: 2 },
  stack: { width: '70%', justifyContent: 'flex-end' },
  legend: { flexDirection: 'row', gap: SPACING.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  swatch: { width: 10, height: 10, borderRadius: 2 },
});
