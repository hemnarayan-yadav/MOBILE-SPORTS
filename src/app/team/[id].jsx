// Team — adapted from frontend/src/pages/public/TeamProfile.jsx: squad,
// matches, statistics and about.
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import { teamsApi } from '../../api/teams.api.js';
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
import { SquadBoard, TeamHero } from '../../components/team/TeamBits.jsx';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { formatNumber } from '../../utils/format.js';

const TABS = Object.freeze(['squad', 'matches', 'stats', 'about']);
const MATCHES_LIMIT = 24;
// Form chips: win / loss / tie (success, live, neutral tones as on the web).
const FORM_TONES = Object.freeze({ win: 'success', loss: 'live', tie: 'surface2' });

function TeamStats({ teamId }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const query = useQuery({
    queryKey: qk.teams.stats(teamId),
    queryFn: () => teamsApi.stats(teamId),
  });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data;
  if (data.totals.played === 0) return <EmptyState title={t('team.noStats')} />;
  return (
    <>
      <TileGrid>
        <StatTile label={t('standings.played')} value={data.totals.played} />
        <StatTile
          label={t('standings.won')}
          value={data.totals.won}
          hint={t('team.lostTied', { lost: data.totals.lost, tied: data.totals.tied })}
        />
        <StatTile
          label={t('stats.pointsFor')}
          value={formatNumber(data.totals.pointsFor)}
          hint={t('stats.againstValue', { value: data.totals.pointsAgainst })}
        />
        <StatTile
          label={t('stats.allOutsInflicted')}
          value={data.totals.allOutsInflicted}
          hint={t('stats.concededValue', { value: data.totals.allOutsConceded })}
        />
      </TileGrid>
      <View style={styles.block}>
        <AppText variant="label" tone="muted">
          {t('team.recentForm')}
        </AppText>
        <View style={styles.form}>
          {data.recentForm.map((result, index) => (
            <View
              key={index}
              style={[styles.formChip, { backgroundColor: colors[FORM_TONES[result]] }]}
            >
              <AppText weight="bold" tone={result === 'tie' ? 'muted' : 'onLive'}>
                {t(`team.formLetter.${result}`)}
              </AppText>
            </View>
          ))}
        </View>
      </View>
      {data.topPlayers.length > 0 ? (
        <Section title={t('team.topPlayers')}>
          <Card>
            {data.topPlayers.map((row, index) => (
              <Pressable
                key={row.player.id}
                onPress={() => router.push(`/player/${row.player.id}`)}
                accessibilityRole="button"
                style={styles.row}
              >
                <AppText variant="score" tone="muted" style={styles.index}>
                  {index + 1}
                </AppText>
                <AppText weight="semibold" numberOfLines={1} style={styles.flex}>
                  {row.player.name}
                </AppText>
                <AppText variant="score">{row.totalPoints}</AppText>
              </Pressable>
            ))}
          </Card>
        </Section>
      ) : null}
    </>
  );
}

function TeamMatches({ teamId }) {
  const { t } = useTranslation();
  const params = { team: teamId, limit: MATCHES_LIMIT };
  const query = useQuery({
    queryKey: qk.matches.list(params),
    queryFn: () => matchesApi.list(params),
  });
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.items.length === 0) return <EmptyState title={t('team.noMatches')} />;
  return query.data.items.map((match) => <MatchCard key={match.id} match={match} />);
}

function About({ team }) {
  const { t } = useTranslation();
  return team.description ? (
    <AppText>{team.description}</AppText>
  ) : (
    <EmptyState title={t('team.noDescription')} />
  );
}

export default function TeamScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [tab, setTab] = useState('squad');
  const query = useQuery({ queryKey: qk.teams.detail(id), queryFn: () => teamsApi.get(id) });
  const team = query.data;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader />
        {query.isPending ? <LoadingState /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
        {team ? (
          <>
            <TeamHero team={team} actions={<FollowButton targetType="team" targetId={team.id} />} />
            <TabStrip
              tabs={TABS.map((tabId) => ({ id: tabId, label: t(`team.tab.${tabId}`) }))}
              value={tab}
              onChange={setTab}
              label={team.name}
            />
            {tab === 'squad' ? <SquadBoard squad={team.squad} /> : null}
            {tab === 'matches' ? <TeamMatches teamId={id} /> : null}
            {tab === 'stats' ? <TeamStats teamId={id} /> : null}
            {tab === 'about' ? <About team={team} /> : null}
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
  block: { gap: SPACING.xs },
  form: { flexDirection: 'row', gap: SPACING.xs },
  formChip: {
    width: 36,
    height: 36,
    borderRadius: RADII.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 44 },
  index: { width: 24 },
});
