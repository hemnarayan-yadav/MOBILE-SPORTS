// Adapted from frontend/src/components/tournament/TournamentBits.jsx and
// components/ranking/LeaderboardList.jsx.
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { IMAGE_WIDTH, cloudinaryImage } from '../../utils/cloudinary.js';
import { formatDate, formatNumber, formatPercent } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import Badge, { StatusBadge } from '../common/Badge.jsx';
import TeamCrest from '../team/TeamCrest.jsx';

const TOP_TEN = 10;
const PODIUM = 3;
// Medal colours for ranks 1–3 (tokens gold, silver, bronze).
const RANK_TOKENS = Object.freeze({ 1: 'gold', 2: 'silver', 3: 'bronze' });

const dateRange = (tournament) =>
  `${formatDate(tournament.startDate)} – ${formatDate(tournament.endDate)}`;
const place = (item) => [item.venue, item.city].filter(Boolean).join(', ');

export function TournamentCard({ tournament }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/tournament/${tournament.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.banner, { backgroundColor: colors.ink }]}>
        {tournament.bannerUrl ? (
          <Image
            source={{ uri: cloudinaryImage(tournament.bannerUrl, { width: IMAGE_WIDTH.card }) }}
            style={[StyleSheet.absoluteFill, styles.bannerImage]}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <StatusBadge status={tournament.status} style={styles.bannerBadge} />
      </View>
      <View style={styles.body}>
        {tournament.season ? (
          <AppText variant="label" tone="muted">
            {tournament.season}
          </AppText>
        ) : null}
        <AppText variant="title" display numberOfLines={2}>
          {tournament.name}
        </AppText>
        <AppText variant="small" tone="muted">
          {dateRange(tournament)}
        </AppText>
        {place(tournament) ? (
          <AppText variant="small" tone="muted" numberOfLines={1}>
            {place(tournament)}
          </AppText>
        ) : null}
        <AppText variant="small" tone="muted">
          {tournament.maxTeams
            ? t('tournament.teamsOfMax', { count: tournament.teamsCount, max: tournament.maxTeams })
            : t('tournament.teamsCount', { count: tournament.teamsCount })}
        </AppText>
      </View>
    </Pressable>
  );
}

export function TournamentHero({ tournament, actions }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.hero, { backgroundColor: colors.ink }]}>
      {tournament.bannerUrl ? (
        <Image
          source={{ uri: cloudinaryImage(tournament.bannerUrl, { width: IMAGE_WIDTH.hero }) }}
          style={[StyleSheet.absoluteFill, styles.heroImage]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <View style={styles.heroBadges}>
        <StatusBadge status={tournament.status} />
        <Badge tone="ink">{t(`tournament.format.${tournament.format}`)}</Badge>
        {tournament.season ? <Badge tone="ink">{tournament.season}</Badge> : null}
      </View>
      <AppText variant="heading" tone="onInk" accessibilityRole="header">
        {tournament.name}
      </AppText>
      <AppText variant="small" tone="onInk">
        {dateRange(tournament)}
      </AppText>
      {place(tournament) ? (
        <AppText variant="small" tone="onInk">
          {place(tournament)}
        </AppText>
      ) : null}
      {tournament.prizePool ? (
        <AppText variant="small" tone="onInk">
          {t('tournament.prizePoolValue', { value: tournament.prizePool })}
        </AppText>
      ) : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

export function RankBadge({ rank }) {
  const { colors } = useTheme();
  const medal = RANK_TOKENS[rank];
  return (
    <View style={[styles.rank, { backgroundColor: medal ? colors[medal] : colors.surface2 }]}>
      <AppText variant="small" weight="bold" tone={medal ? 'ink' : 'muted'}>
        {rank}
      </AppText>
    </View>
  );
}

// Points table: # · team · P W L · points (ties and score difference are in
// each row's accessible description, as the web hides them on phones).
export function StandingsTable({ rows }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const cols = [
    ['played', 'P'],
    ['won', 'W'],
    ['lost', 'L'],
  ];
  return (
    <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.tr, { backgroundColor: colors.surface2 }]}>
        <AppText variant="label" tone="muted" style={styles.rankCol}>
          #
        </AppText>
        <AppText variant="label" tone="muted" style={styles.flex}>
          {t('standings.team')}
        </AppText>
        {cols.map(([key, short]) => (
          <AppText
            key={key}
            variant="label"
            tone="muted"
            style={styles.num}
            accessibilityLabel={t(`standings.${key}`)}
          >
            {short}
          </AppText>
        ))}
        <AppText variant="label" tone="muted" style={styles.pts}>
          {t('standings.points')}
        </AppText>
      </View>
      {rows.map((row) => (
        <Pressable
          key={row.team.id}
          onPress={() => router.push(`/team/${row.team.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${row.rank}. ${row.team.name}: ${t('standings.played')} ${row.played}, ${t('standings.won')} ${row.won}, ${t('standings.lost')} ${row.lost}, ${t('standings.tied')} ${row.tied}, ${t('standings.scoreDiff')} ${row.scoreDiff}, ${t('stats.points')} ${row.points}`}
          style={[styles.tr, { borderTopColor: colors.border }, styles.rowBorder]}
        >
          <View style={styles.rankCol}>
            <RankBadge rank={row.rank} />
          </View>
          <View style={[styles.flex, styles.teamCell]}>
            <TeamCrest team={row.team} size="xs" />
            <AppText weight="semibold" numberOfLines={1} style={styles.flex}>
              {row.team.shortName ?? row.team.name}
            </AppText>
          </View>
          {cols.map(([key]) => (
            <AppText key={key} style={styles.num}>
              {row[key]}
            </AppText>
          ))}
          <AppText variant="score" style={styles.pts}>
            {row.points}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

// Top 3 get medals, ranks 4–10 a highlighted band (design rule from the spec).
export function LeaderboardList({ entries, category, compact = false }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const rate = category === 'best_defender' ? 'tackleSuccessRate' : 'raidSuccessRate';
  return (
    <View style={[styles.table, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {entries.map((entry, index) => {
        const highlighted = entry.rank > PODIUM && entry.rank <= TOP_TEN;
        return (
          <Pressable
            key={entry.player.id}
            onPress={() => router.push(`/player/${entry.player.id}`)}
            accessibilityRole="button"
            style={[
              styles.leader,
              index > 0 && [styles.rowBorder, { borderTopColor: colors.border }],
              highlighted && { backgroundColor: colors.brandSoft },
            ]}
          >
            <RankBadge rank={entry.rank} />
            <Avatar
              src={entry.player.photoUrl}
              name={entry.player.name}
              size={compact ? 'sm' : 'md'}
            />
            <View style={styles.flex}>
              <AppText weight="semibold" numberOfLines={1}>
                {entry.player.name}
              </AppText>
              <AppText variant="small" tone="muted" numberOfLines={1}>
                {entry.team?.name ?? t('player.freeAgent')}
                {compact
                  ? ''
                  : ` · ${t('stats.matchesCount', { count: entry.matches })} · ${formatPercent(entry.metrics?.[rate])}`}
              </AppText>
            </View>
            <View style={styles.scoreCol}>
              <AppText variant="score">{formatNumber(entry.score)}</AppText>
              <AppText variant="label" tone="muted">
                {t(`rankings.scoreLabel.${category}`)}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: 1, borderRadius: RADII.xxl, overflow: 'hidden' },
  banner: { height: 96, justifyContent: 'flex-start', padding: SPACING.md },
  bannerImage: { opacity: 0.8 },
  bannerBadge: { zIndex: 1 },
  body: { padding: SPACING.lg, gap: 4 },
  hero: { borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.sm, overflow: 'hidden' },
  heroImage: { opacity: 0.3 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  rank: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  table: { borderWidth: 1, borderRadius: RADII.xxl, overflow: 'hidden' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    minHeight: 44,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth },
  rankCol: { width: 34 },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  num: { width: 24, textAlign: 'center' },
  pts: { width: 44, textAlign: 'right' },
  leader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  scoreCol: { alignItems: 'flex-end' },
});
