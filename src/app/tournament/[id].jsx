// Tournament — adapted from frontend/src/pages/public/TournamentDetails.jsx:
// overview, fixtures, points table, teams and leaders. (A captain's
// registration and the organiser's tools come with later phases.)
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi, rankingsApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import { tournamentsApi } from '../../api/tournaments.api.js';
import AppText from '../../components/common/AppText.jsx';
import FollowButton from '../../components/common/FollowButton.jsx';
import {
  BackHeader,
  Card,
  Section,
  StatTile,
  TabStrip,
  TileGrid,
} from '../../components/common/Layout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import TeamCrest from '../../components/team/TeamCrest.jsx';
import {
  LeaderboardList,
  StandingsTable,
  TournamentHero,
} from '../../components/tournament/TournamentBits.jsx';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { LEADERBOARD_CATEGORIES } from '../../utils/constants.js';
import { formatNumber } from '../../utils/format.js';

const TABS = Object.freeze(['overview', 'fixtures', 'standings', 'teams', 'leaders']);
const FIXTURES_LIMIT = 50;
const LEADERS_LIMIT = 10;

// Loading, error and empty around a query's data.
function QueryBlock({ query, isEmpty, emptyTitle, children }) {
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (isEmpty?.(query.data)) return <EmptyState title={emptyTitle} />;
  return children(query.data);
}

function Overview({ tournament }) {
  const { t } = useTranslation();
  const router = useRouter();
  const stats = useQuery({
    queryKey: qk.tournaments.stats(tournament.id),
    queryFn: () => tournamentsApi.stats(tournament.id),
  });
  const value = (pick) => (stats.data ? formatNumber(pick(stats.data)) : '—');
  return (
    <>
      {tournament.description ? <AppText>{tournament.description}</AppText> : null}
      <TileGrid>
        <StatTile label={t('tournament.teams')} value={tournament.teamsCount} />
        <StatTile label={t('stats.matchesPlayed')} value={value((d) => d.matchesPlayed)} />
        <StatTile label={t('stats.totalPoints')} value={value((d) => d.totals.totalPoints)} />
        <StatTile label={t('stats.allOuts')} value={value((d) => d.totals.allOuts)} />
      </TileGrid>
      {stats.data?.topScorers.length > 0 ? (
        <Section title={t('tournament.topScorers')}>
          <Card>
            {stats.data.topScorers.map((row, index) => (
              <Pressable
                key={row.player.id}
                onPress={() => router.push(`/player/${row.player.id}`)}
                accessibilityRole="button"
                style={styles.row}
              >
                <AppText variant="score" tone="muted" style={styles.index}>
                  {index + 1}
                </AppText>
                <View style={styles.flex}>
                  <AppText weight="semibold" numberOfLines={1}>
                    {row.player.name}
                  </AppText>
                  {row.team ? (
                    <AppText variant="small" tone="muted" numberOfLines={1}>
                      {row.team.name}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="score">{row.totalPoints}</AppText>
              </Pressable>
            ))}
          </Card>
        </Section>
      ) : null}
    </>
  );
}

function Fixtures({ tournamentId }) {
  const { t } = useTranslation();
  const params = { tournament: tournamentId, limit: FIXTURES_LIMIT, order: 'asc' };
  const query = useQuery({
    queryKey: qk.matches.list(params),
    queryFn: () => matchesApi.list(params),
  });
  return (
    <QueryBlock
      query={query}
      isEmpty={(d) => d.items.length === 0}
      emptyTitle={t('tournament.noFixtures')}
    >
      {(data) => data.items.map((match) => <MatchCard key={match.id} match={match} />)}
    </QueryBlock>
  );
}

function Standings({ tournamentId }) {
  const { t } = useTranslation();
  const params = { tournament_id: tournamentId };
  const query = useQuery({
    queryKey: qk.rankings.teams(params),
    queryFn: () => rankingsApi.teams(params),
  });
  return (
    <QueryBlock
      query={query}
      isEmpty={(d) => d.rows.length === 0}
      emptyTitle={t('standings.empty')}
    >
      {(data) => <StandingsTable rows={data.rows} />}
    </QueryBlock>
  );
}

function Teams({ tournamentId }) {
  const { t } = useTranslation();
  const router = useRouter();
  const query = useQuery({
    queryKey: qk.tournaments.teams(tournamentId, {}),
    queryFn: () => tournamentsApi.teams(tournamentId),
  });
  return (
    <QueryBlock query={query} isEmpty={(d) => d.length === 0} emptyTitle={t('tournament.noTeams')}>
      {(registrations) =>
        registrations.map((registration) => (
          <Pressable
            key={registration.id}
            onPress={() => router.push(`/team/${registration.team.id}`)}
            accessibilityRole="button"
          >
            <Card style={styles.teamRow}>
              <TeamCrest team={registration.team} />
              <View style={styles.flex}>
                <AppText weight="semibold" numberOfLines={1}>
                  {registration.team.name}
                </AppText>
                <AppText variant="small" tone="muted">
                  {t('team.playersCount', { count: registration.squadCount })}
                </AppText>
              </View>
            </Card>
          </Pressable>
        ))
      }
    </QueryBlock>
  );
}

function Leaders({ tournamentId }) {
  const { t } = useTranslation();
  const params = { tournament_id: tournamentId, limit: LEADERS_LIMIT };
  const query = useQuery({
    queryKey: qk.rankings.overview(params),
    queryFn: () => rankingsApi.overview(params),
  });
  return (
    <QueryBlock
      query={query}
      isEmpty={(d) => LEADERBOARD_CATEGORIES.every((c) => !d[c]?.entries.length)}
      emptyTitle={t('rankings.empty')}
    >
      {(data) =>
        LEADERBOARD_CATEGORIES.map((category) => (
          <View key={category} style={styles.block}>
            <AppText variant="label" tone="muted">
              {t(`rankings.category.${category}`)}
            </AppText>
            {data[category].entries.length ? (
              <LeaderboardList entries={data[category].entries} category={category} compact />
            ) : (
              <AppText tone="muted">{t('rankings.empty')}</AppText>
            )}
          </View>
        ))
      }
    </QueryBlock>
  );
}

export default function TournamentScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [tab, setTab] = useState('overview');
  const query = useQuery({
    queryKey: qk.tournaments.detail(id),
    queryFn: () => tournamentsApi.get(id),
  });
  const tournament = query.data;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader />
        {query.isPending ? <LoadingState /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
        {tournament ? (
          <>
            <TournamentHero
              tournament={tournament}
              actions={<FollowButton targetType="tournament" targetId={tournament.id} />}
            />
            <TabStrip
              tabs={TABS.map((tabId) => ({ id: tabId, label: t(`tournament.tab.${tabId}`) }))}
              value={tab}
              onChange={setTab}
              label={tournament.name}
            />
            {tab === 'overview' ? <Overview tournament={tournament} /> : null}
            {tab === 'fixtures' ? <Fixtures tournamentId={id} /> : null}
            {tab === 'standings' ? <Standings tournamentId={id} /> : null}
            {tab === 'teams' ? <Teams tournamentId={id} /> : null}
            {tab === 'leaders' ? <Leaders tournamentId={id} /> : null}
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
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 44 },
  index: { width: 24 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  block: { gap: SPACING.sm },
});
