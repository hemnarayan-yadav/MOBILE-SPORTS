// Home — adapted from frontend/src/pages/public/Home.jsx. Same building blocks
// as the web: match tabs (live/upcoming/completed) with a "See all", a
// tournament preview, three leaderboard boards, and a signed-in shortcut card
// ("Create your team" for a user without a team, "My team" for a captain).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi, rankingsApi } from '../../api/matches.api.js';
import { newsFeedApi } from '../../api/newsFeed.api.js';
import { noticesApi } from '../../api/notices.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import { LanguageSwitcher, ThemeToggle } from '../../components/common/Controls.jsx';
import { TabStrip } from '../../components/common/Layout.jsx';
import Logo from '../../components/common/Logo.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import AutoCarousel from '../../components/notice/AutoCarousel.jsx';
import { NewsCard, NoticeCard } from '../../components/notice/NoticeBits.jsx';
import { LeaderboardList } from '../../components/tournament/TournamentBits.jsx';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import {
  LEADERBOARD_CATEGORIES,
  MATCH_STATUS,
  PLAYER_ROLES,
  ROLES,
} from '../../utils/constants.js';

// A short preview on Home keeps the payload light on low-end Androids — full
// lists live on the tab screens (paged).
const PREVIEW_LIMIT = 5;
const LEADER_LIMIT = 3;
// The live block matches the web's cadence; an open match page is pushed live
// over its socket.
const LIVE_REFRESH_MS = 60_000;
const NOTICE_TAB = Object.freeze({ TOURNAMENTS: 'tournaments', NEWS: 'news' });
// Cards on screen at once, and how many are fetched for the carousel to
// move through before anyone has to open the full screen.
const HOME_CARDS = 2;
const CAROUSEL_POOL = 8;

// The same person icon whether or not anyone is signed in — it is the way to
// the account either way, and a different glyph per state only made the header
// change shape on sign-in. Where it goes and what it is called still differ:
// the profile for a signed-in account, sign-in for a visitor. Nothing while the
// stored session is still being restored, so the icon does not flicker.
function AccountIconButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const status = useAuthStore((s) => s.status);
  if (status === AUTH_STATUS.UNKNOWN) return null;
  const signedIn = status === AUTH_STATUS.AUTHENTICATED;
  const label = t(signedIn ? 'app.accountLabel' : 'app.signInLabel');
  return (
    <Pressable
      onPress={() => router.push(signedIn ? '/dashboard/profile' : '/auth/login')}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.iconButton, { backgroundColor: colors.surface2 }]}
    >
      <Ionicons name="person-circle-outline" size={22} color={colors.text} />
    </Pressable>
  );
}

function Header() {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Logo height={30} title={t('nav.brand')} />
        <View style={styles.controls}>
          <LanguageSwitcher />
          <ThemeToggle />
          <AccountIconButton />
        </View>
      </View>
    </View>
  );
}

// A single section frame: title on the left, an optional "See all" action on
// the right, and its body underneath. Matches the web's Section spacing.
function Section({ title, actionTo, actionLabel, children }) {
  const router = useRouter();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {actionTo ? (
          <Pressable
            onPress={() => router.push(actionTo)}
            accessibilityRole="button"
            style={styles.sectionAction}
          >
            <AppText weight="semibold" tone="brandStrong">
              {`${actionLabel} ›`}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

// Signed-in shortcut: "My team" for a captain (into the captain desk),
// otherwise "Create your team" (into the user's create-team flow). Nothing
// while the session is still being restored, and nothing for a signed-out
// visitor.
function TeamShortcut() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  if (status !== AUTH_STATUS.AUTHENTICATED || !user) return null;
  // Only a player or a captain has a team of their own. An organiser (Admin,
  // Manager, Super Admin) runs competitions from the website and must not be
  // offered "create your team" here, which their role could not finish.
  if (!PLAYER_ROLES.includes(user.role)) return null;
  const isCaptain = user.role === ROLES.CAPTAIN;
  const target = isCaptain ? '/captain' : '/user/create-team';
  const title = t(isCaptain ? 'app.myTeamTitle' : 'app.createTeamTitle');
  const subtitle = t(isCaptain ? 'app.myTeamSubtitle' : 'app.createTeamSubtitle');
  const iconName = isCaptain ? 'shield-checkmark-outline' : 'add-circle-outline';
  return (
    <Pressable
      onPress={() => router.push(target)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.shortcut, { backgroundColor: colors.brandSoft, borderColor: colors.border }]}
    >
      <View style={[styles.shortcutIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name={iconName} size={22} color={colors.brandStrong} />
      </View>
      <View style={styles.flex}>
        <AppText weight="semibold" tone="brandStrong">
          {title}
        </AppText>
        <AppText variant="small" tone="muted">
          {subtitle}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

// Live matches, and **only** when something is live. A "Live" tab sitting
// empty for most of the day is the first thing a reader sees and says the app
// is dead; between matches the section below takes its place instead. Upcoming
// and completed matches stay one tap away on the Matches tab.
function LiveSection() {
  const { t } = useTranslation();
  const params = { status: MATCH_STATUS.LIVE, limit: PREVIEW_LIMIT };
  const query = useQuery({
    queryKey: qk.matches.list(params),
    queryFn: () => matchesApi.list(params),
    refetchInterval: LIVE_REFRESH_MS,
  });

  const live = query.data?.items ?? [];
  // Nothing on the mat, nothing to say. No empty state, no heading: the
  // section is simply not there.
  if (live.length === 0) return null;

  return (
    <Section title={t('match.tabLive')} actionTo="/matches" actionLabel={t('common.viewAll')}>
      <View style={styles.stack}>
        {live.slice(0, PREVIEW_LIMIT).map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </View>
    </Section>
  );
}

// What Kabaddi is happening that this reader is not already part of: tournaments
// other people are running, and news from elsewhere. One section, two tabs,
// because they answer the same question in two ways.
// What Kabaddi is happening that this reader is not already part of:
// tournaments other people are running, and news from elsewhere.
//
// Two cards at a time, moving on by themselves (AutoCarousel). A section on
// Home has to earn its height: five cards pushed everything below it off the
// screen, and two that change are more worth glancing at than five that do
// not. "View all" is there for anyone who wants the rest.
function NoticesSection() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(NOTICE_TAB.TOURNAMENTS);
  const tournaments = tab === NOTICE_TAB.TOURNAMENTS;

  const noticeParams = { phase: 'upcoming', limit: CAROUSEL_POOL };
  const newsParams = { limit: CAROUSEL_POOL };
  const noticeQuery = useQuery({
    queryKey: qk.notices.list(noticeParams),
    queryFn: () => noticesApi.list(noticeParams),
    // The other tab is not fetched until somebody asks for it.
    enabled: tournaments,
  });
  const newsQuery = useQuery({
    queryKey: qk.newsFeed.list(newsParams),
    queryFn: () => newsFeedApi.list(newsParams),
    enabled: !tournaments,
  });

  const query = tournaments ? noticeQuery : newsQuery;
  const items = query.data?.items ?? [];

  return (
    <Section
      title={t('notices.sectionTitle')}
      actionTo="/notices"
      actionLabel={t('common.viewAll')}
    >
      <TabStrip
        label={t('notices.sectionTitle')}
        value={tab}
        onChange={setTab}
        tabs={[
          { id: NOTICE_TAB.TOURNAMENTS, label: t('notices.tabTournaments') },
          { id: NOTICE_TAB.NEWS, label: t('notices.tabNews') },
        ]}
      />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t(tournaments ? 'notices.emptyTitle' : 'notices.newsEmptyTitle')}
          hint={t(tournaments ? 'notices.emptyHint' : 'notices.newsEmptyHint')}
        />
      ) : (
        <AutoCarousel
          // Keyed by tab so switching starts at the first card rather than
          // halfway through the other tab's list.
          key={tab}
          items={items}
          perPage={HOME_CARDS}
          keyExtractor={(item) => item.id}
          renderItem={(item) =>
            tournaments ? <NoticeCard notice={item} /> : <NewsCard item={item} />
          }
        />
      )}
    </Section>
  );
}

function LeadersSection() {
  const { t } = useTranslation();
  const params = { limit: LEADER_LIMIT };
  const query = useQuery({
    queryKey: qk.rankings.overview(params),
    queryFn: () => rankingsApi.overview(params),
  });
  const boards = query.data
    ? LEADERBOARD_CATEGORIES.filter((c) => query.data[c]?.entries?.length)
    : [];
  return (
    <Section title={t('home.leadersTitle')} actionTo="/rankings" actionLabel={t('common.viewAll')}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : boards.length === 0 ? (
        <EmptyState title={t('app.leadersEmpty')} hint={t('app.leadersEmptyHint')} />
      ) : (
        <View style={styles.stack}>
          {boards.map((category) => (
            <View key={category} style={styles.leaderBoard}>
              <AppText variant="label" tone="muted">
                {t(`rankings.category.${category}`)}
              </AppText>
              <LeaderboardList entries={query.data[category].entries} category={category} compact />
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}

export default function Home() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header />
        <TeamShortcut />
        <LiveSection />
        <NoticesSection />
        <LeadersSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  header: { gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  iconButton: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.sm,
  },
  section: { gap: SPACING.sm },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionAction: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: SPACING.xs },
  stack: { gap: SPACING.sm },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  leaderBoard: { gap: SPACING.xs },
});
