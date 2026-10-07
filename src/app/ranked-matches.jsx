// Ranked matches — adapted from frontend/src/pages/public/RankedMatches.jsx:
// every match that counts towards the rankings, grouped by the competition it
// belongs to and then by the day it was played. Never one flat list.
//
// The API groups by competition and pages by competition, so the infinite list
// loads whole competitions at a time and no group costs a request of its own.
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi } from '../api/matches.api.js';
import { qk } from '../api/queryKeys.js';
import AppText from '../components/common/AppText.jsx';
import Badge, { StatusBadge } from '../components/common/Badge.jsx';
import { BackHeader, Card } from '../components/common/Layout.jsx';
import PagedList from '../components/common/PagedList.jsx';
import { WinMargin } from '../components/match/MatchResult.jsx';
import TeamCrest from '../components/team/TeamCrest.jsx';
import { usePagedQuery } from '../hooks/usePagedQuery.js';
import { MIN_TOUCH, SPACING } from '../theme/tokens.js';
import { useTheme } from '../theme/useTheme.js';
import { MATCH_STATUS } from '../utils/constants.js';
import { formatDate, formatTime } from '../utils/format.js';

// Competitions per page, not matches.
const PAGE_SIZE = 10;
const LIVE_REFRESH_MS = 60_000;

// The day is worked out on the phone, not the server, because it has to be the
// reader's own day. `scheduledAt` is the match's date and the order the API
// sorted by, so grouping and ordering cannot disagree.
function byDay(matches) {
  const days = new Map();
  for (const match of matches) {
    const key = new Date(match.scheduledAt).toDateString();
    if (!days.has(key)) days.set(key, { key, at: match.scheduledAt, matches: [] });
    days.get(key).matches.push(match);
  }
  return [...days.values()];
}

function MatchRow({ match }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const showScore = match.status === MATCH_STATUS.LIVE || match.status === MATCH_STATUS.COMPLETED;
  const completed = match.status === MATCH_STATUS.COMPLETED;
  const won = (team) => completed && match.winner === team?.id;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/match/${match.id}`)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText variant="small" tone="muted" style={styles.time}>
        {formatTime(match.scheduledAt)}
      </AppText>
      <View style={styles.fixture}>
        <View style={styles.side}>
          <TeamCrest team={match.teamA} size="xs" />
          <AppText
            weight={won(match.teamA) ? 'bold' : 'semibold'}
            numberOfLines={1}
            style={styles.flex}
          >
            {match.teamA?.name ?? '—'}
          </AppText>
        </View>
        <AppText tone="muted" weight="semibold">
          {showScore ? `${match.teamAScore} – ${match.teamBScore}` : t('match.vs')}
        </AppText>
        <View style={styles.side}>
          <TeamCrest team={match.teamB} size="xs" />
          <AppText
            weight={won(match.teamB) ? 'bold' : 'semibold'}
            numberOfLines={1}
            style={styles.flex}
          >
            {match.teamB?.name ?? '—'}
          </AppText>
        </View>
      </View>
      <WinMargin match={match} />
      {match.status === MATCH_STATUS.LIVE ? (
        <Badge tone="live">{t('match.live')}</Badge>
      ) : (
        <StatusBadge status={match.status} />
      )}
    </Pressable>
  );
}

function CompetitionGroup({ group }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { tournament, matchCount, matches } = group;

  const heading = (
    <AppText variant="title" numberOfLines={2}>
      {tournament ? tournament.name : t('rankedMatches.friendlies')}
    </AppText>
  );

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.flex}>
          {tournament ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/tournament/${tournament.id}`)}
            >
              {heading}
            </Pressable>
          ) : (
            heading
          )}
          {tournament?.season ? (
            <AppText variant="small" tone="muted">
              {tournament.season}
            </AppText>
          ) : null}
        </View>
        <Badge tone="info">{t('rankedMatches.countedMatches', { count: matchCount })}</Badge>
      </View>

      {byDay(matches).map((day) => (
        <View key={day.key} style={styles.day}>
          <AppText variant="label" tone="muted">
            {formatDate(day.at)}
          </AppText>
          {day.matches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </View>
      ))}
    </Card>
  );
}

export default function RankedMatches() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const query = usePagedQuery({
    queryKey: qk.matches.ranked({ limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => matchesApi.ranked({ page, limit: PAGE_SIZE }),
    refetchInterval: LIVE_REFRESH_MS,
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <BackHeader title={t('rankedMatches.pageTitle')} />
      <PagedList
        query={query}
        items={query.items}
        keyExtractor={(group) => group.tournament?.id ?? 'friendlies'}
        renderItem={({ item }) => <CompetitionGroup group={item} />}
        header={
          <AppText tone="muted" style={styles.intro}>
            {t('rankedMatches.pageSubtitle')}
          </AppText>
        }
        emptyTitle={t('rankedMatches.emptyTitle')}
        emptyHint={t('rankedMatches.emptyHint')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  intro: { marginBottom: SPACING.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  day: { gap: SPACING.xs, marginTop: SPACING.sm },
  row: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  time: { width: 52 },
  fixture: { flex: 1, gap: SPACING.xs },
  side: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  flex: { flex: 1 },
});
