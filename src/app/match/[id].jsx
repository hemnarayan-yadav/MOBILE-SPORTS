// Match centre — adapted from frontend/src/pages/public/MatchDetails.jsx. The
// match is pushed live over its Socket.io room (hooks/useMatchSocket.js); the
// sections follow its status, as on the web.
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import Badge from '../../components/common/Badge.jsx';
import FollowButton from '../../components/common/FollowButton.jsx';
import { BackHeader, TabStrip } from '../../components/common/Layout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import {
  HeadToHead,
  Lineups,
  MatchInfo,
  MvpCard,
  RaidFeed,
  Squads,
  TeamStatsCompare,
  TopPerformers,
} from '../../components/match/MatchSections.jsx';
import ScoreBoard from '../../components/match/ScoreBoard.jsx';
import { useMatchSocket } from '../../hooks/useMatchSocket.js';
import { getSportUI } from '../../sports/index.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';

const TABS_BY_STATUS = Object.freeze({
  live: ['feed', 'lineups', 'stats'],
  upcoming: ['overview', 'squads', 'headToHead'],
  completed: ['summary', 'feed', 'lineups', 'stats'],
  cancelled: ['overview'],
});
const SUMMARY_FEED_ITEMS = 5;

function MatchView({ match, connected }) {
  const { t } = useTranslation();
  const tabs = TABS_BY_STATUS[match.status] ?? TABS_BY_STATUS.cancelled;
  const [chosenTab, setTab] = useState(null);
  const tab = tabs.includes(chosenTab) ? chosenTab : tabs[0];
  const sport = getSportUI(match.sport);
  const directory = useMemo(() => sport.matchDirectory(match), [sport, match]);
  const timeline = useMemo(() => sport.buildTimeline(match.live), [sport, match.live]);

  return (
    <>
      <ScoreBoard match={match} directory={directory} />
      <View style={styles.actions}>
        <FollowButton targetType="match" targetId={match.id} />
        {match.status === 'live' && !connected ? (
          <Badge tone="warning">{t('live.reconnecting')}</Badge>
        ) : null}
      </View>
      <TabStrip
        tabs={tabs.map((id) => ({ id, label: t(`match.tab.${id}`) }))}
        value={tab}
        onChange={setTab}
        label={t('match.sections')}
      />
      {tab === 'feed' ? <RaidFeed match={match} timeline={timeline} directory={directory} /> : null}
      {tab === 'lineups' ? <Lineups match={match} /> : null}
      {tab === 'stats' ? (
        <>
          <TeamStatsCompare match={match} />
          <TopPerformers match={match} directory={directory} />
        </>
      ) : null}
      {tab === 'summary' ? (
        <>
          <MvpCard match={match} />
          <TopPerformers match={match} directory={directory} />
          <RaidFeed
            match={match}
            timeline={timeline}
            directory={directory}
            limit={SUMMARY_FEED_ITEMS}
          />
        </>
      ) : null}
      {tab === 'overview' ? <MatchInfo match={match} /> : null}
      {tab === 'squads' ? <Squads match={match} /> : null}
      {tab === 'headToHead' ? <HeadToHead match={match} /> : null}
      {match.status !== 'upcoming' && tab !== 'overview' ? <MatchInfo match={match} /> : null}
    </>
  );
}

export default function MatchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const query = useQuery({ queryKey: qk.matches.detail(id), queryFn: () => matchesApi.get(id) });
  const { connected } = useMatchSocket(id);

  let body = <LoadingState />;
  if (query.isError) {
    body =
      query.error?.status === 404 ? (
        <EmptyState title={t('errors.notFound')} />
      ) : (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      );
  } else if (query.data) {
    body = <MatchView match={query.data} connected={connected} />;
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader />
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
});
