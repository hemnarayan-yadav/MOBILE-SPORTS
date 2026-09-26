// Rankings — adapted from frontend/src/pages/public/Rankings.jsx: the three
// player leaderboards and team standings, all-time or for one tournament.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rankingsApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import { tournamentsApi } from '../../api/tournaments.api.js';
import AppText from '../../components/common/AppText.jsx';
import { TabStrip } from '../../components/common/Layout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import { LeaderboardList, StandingsTable } from '../../components/tournament/TournamentBits.jsx';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { LEADERBOARD_CATEGORIES } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';

const LIMIT = 50;
const TEAMS = 'teams';
const ALL_TIME = '';

function Result({ query, isEmpty, emptyTitle, emptyHint, children }) {
  const { t } = useTranslation();
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (isEmpty(query.data)) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return (
    <>
      {children(query.data)}
      {query.data.computedAt ? (
        <AppText variant="small" tone="muted">
          {t('rankings.updatedAt', { time: formatDateTime(query.data.computedAt) })}
        </AppText>
      ) : null}
    </>
  );
}

export default function Rankings() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState(LEADERBOARD_CATEGORIES[0]);
  const [tournamentId, setTournamentId] = useState(ALL_TIME);
  const tournaments = useQuery({
    queryKey: qk.tournaments.list({ limit: LIMIT }),
    queryFn: () => tournamentsApi.list({ limit: LIMIT }),
  });
  const playerParams = { category: tab, limit: LIMIT, tournament_id: tournamentId };
  const players = useQuery({
    queryKey: qk.rankings.players(playerParams),
    queryFn: () => rankingsApi.players(playerParams),
    enabled: tab !== TEAMS,
  });
  const teams = useQuery({
    queryKey: qk.rankings.teams({ tournament_id: tournamentId }),
    queryFn: () => rankingsApi.teams({ tournament_id: tournamentId }),
    enabled: tab === TEAMS,
  });

  const scopes = [
    { id: ALL_TIME, label: t('rankings.allTime') },
    ...(tournaments.data?.items ?? []).map((item) => ({ id: item.id, label: item.name })),
  ];
  const tabs = [
    ...LEADERBOARD_CATEGORIES.map((id) => ({ id, label: t(`rankings.category.${id}`) })),
    { id: TEAMS, label: t('rankings.teamStandings') },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="heading" accessibilityRole="header">
          {t('rankings.pageTitle')}
        </AppText>
        <View style={styles.block}>
          <AppText variant="label" tone="muted">
            {t('rankings.scope')}
          </AppText>
          <TabStrip
            tabs={scopes}
            value={tournamentId}
            onChange={setTournamentId}
            label={t('rankings.scope')}
          />
        </View>
        <TabStrip tabs={tabs} value={tab} onChange={setTab} label={t('rankings.pageTitle')} />
        {tab === TEAMS ? (
          <Result
            query={teams}
            isEmpty={(data) => data.rows.length === 0}
            emptyTitle={t('standings.empty')}
          >
            {(data) => <StandingsTable rows={data.rows} />}
          </Result>
        ) : (
          <Result
            query={players}
            isEmpty={(data) => data.entries.length === 0}
            emptyTitle={t('rankings.empty')}
            emptyHint={t('rankings.emptyHint')}
          >
            {(data) => <LeaderboardList entries={data.entries} category={tab} />}
          </Result>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  block: { gap: SPACING.xs },
});
