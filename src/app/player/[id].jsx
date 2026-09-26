// Player — adapted from frontend/src/pages/public/PlayerProfile.jsx: career
// statistics, recent form (as simple bars; no chart library), recent matches
// and the teams played for.
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { qk } from '../../api/queryKeys.js';
import { playersApi } from '../../api/teams.api.js';
import AppText from '../../components/common/AppText.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Badge from '../../components/common/Badge.jsx';
import { BackHeader, Card, Section, StatTile, TileGrid } from '../../components/common/Layout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import { CareerStats, PlayingRoleBadge, PointsBars } from '../../components/player/PlayerBits.jsx';
import TeamCrest from '../../components/team/TeamCrest.jsx';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { formatDate, formatPercent } from '../../utils/format.js';

function Header({ player }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const facts = [
    [
      'age',
      player.age !== null && player.age !== undefined
        ? t('player.years', { count: player.age })
        : null,
    ],
    ['height', player.heightCm ? `${player.heightCm} cm` : null],
    ['weight', player.weightKg ? `${player.weightKg} kg` : null],
    ['hometown', player.hometown],
  ].filter(([, value]) => value);
  return (
    <View style={[styles.hero, { backgroundColor: colors.ink }]}>
      <View style={styles.heroRow}>
        <Avatar src={player.photoUrl} name={player.name} size="xl" />
        {player.membership ? (
          <Badge tone="brand">{`#${player.membership.jerseyNumber}`}</Badge>
        ) : null}
      </View>
      <View style={styles.badges}>
        {player.membership ? <PlayingRoleBadge role={player.membership.playingRole} /> : null}
        {!player.currentTeam ? <Badge tone="ink">{t('player.freeAgent')}</Badge> : null}
      </View>
      <AppText variant="heading" tone="onInk" accessibilityRole="header">
        {player.name}
      </AppText>
      {player.currentTeam ? (
        <Pressable
          onPress={() => router.push(`/team/${player.currentTeam.id}`)}
          accessibilityRole="link"
          style={styles.teamLink}
        >
          <TeamCrest team={player.currentTeam} size="sm" />
          <AppText weight="semibold" tone="onInk">
            {player.currentTeam.name}
          </AppText>
        </Pressable>
      ) : null}
      {facts.map(([key, value]) => (
        <AppText key={key} variant="small" tone="onInk">
          {`${t(`player.fact.${key}`)}: ${value}`}
        </AppText>
      ))}
    </View>
  );
}

function RecentMatches({ matches }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Card>
      {matches.map((m) => (
        <Pressable
          key={m.matchId}
          onPress={() => router.push(`/match/${m.matchId}`)}
          accessibilityRole="button"
          style={styles.row}
        >
          <View style={styles.flex}>
            <AppText weight="semibold" numberOfLines={1}>
              {`${m.teamA?.shortName ?? ''} ${m.teamAScore} – ${m.teamBScore} ${m.teamB?.shortName ?? ''}`}
            </AppText>
            <AppText variant="small" tone="muted" numberOfLines={1}>
              {formatDate(m.playedAt)}
              {m.tournament ? ` · ${m.tournament.name}` : ''}
            </AppText>
          </View>
          {m.isMvp ? <Badge tone="brand">{t('match.mvp')}</Badge> : null}
          <AppText variant="score">{m.totalPoints}</AppText>
        </Pressable>
      ))}
    </Card>
  );
}

function History({ history }) {
  const { t } = useTranslation();
  const router = useRouter();
  return history.map((entry, index) => (
    <Pressable
      key={`${entry.team.id}-${index}`}
      onPress={() => router.push(`/team/${entry.team.id}`)}
      accessibilityRole="button"
    >
      <Card style={styles.historyRow}>
        <TeamCrest team={entry.team} size="sm" />
        <View style={styles.flex}>
          <AppText weight="semibold" numberOfLines={1}>
            {entry.team.name}
          </AppText>
          <AppText variant="small" tone="muted">
            {`#${entry.jerseyNumber} · ${formatDate(entry.joinedAt)} – ${entry.leftAt ? formatDate(entry.leftAt) : t('player.present')}`}
          </AppText>
        </View>
      </Card>
    </Pressable>
  ));
}

export default function PlayerScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const player = useQuery({ queryKey: qk.players.detail(id), queryFn: () => playersApi.get(id) });
  const stats = useQuery({
    queryKey: qk.players.stats(id),
    queryFn: () => playersApi.stats(id),
    enabled: player.isSuccess,
  });
  const p = player.data;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader />
        {player.isPending ? <LoadingState /> : null}
        {player.isError ? (
          <ErrorState error={player.error} onRetry={() => player.refetch()} />
        ) : null}
        {p ? (
          <>
            <Header player={p} />
            {p.bio ? <AppText>{p.bio}</AppText> : null}
            <Section title={t('player.career')}>
              <CareerStats stats={p.careerStats} />
              {stats.data ? (
                <TileGrid>
                  <StatTile
                    label={t('stats.raidSuccessRate')}
                    value={formatPercent(stats.data.rates.raidSuccessRate)}
                  />
                  <StatTile
                    label={t('stats.tackleSuccessRate')}
                    value={formatPercent(stats.data.rates.tackleSuccessRate)}
                  />
                </TileGrid>
              ) : null}
            </Section>
            <Section title={t('player.recentForm')}>
              {stats.isPending ? <LoadingState /> : null}
              {stats.data?.recentMatches.length ? (
                <>
                  <PointsBars matches={stats.data.recentMatches} />
                  <RecentMatches matches={stats.data.recentMatches} />
                </>
              ) : null}
              {stats.data && !stats.data.recentMatches.length ? (
                <EmptyState title={t('player.noMatches')} />
              ) : null}
            </Section>
            {p.history?.length > 0 ? (
              <Section title={t('player.history')}>
                <History history={p.history} />
              </Section>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  flex: { flex: 1 },
  hero: { borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.sm },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  teamLink: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 48 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
});
