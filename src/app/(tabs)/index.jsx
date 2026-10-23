// Home — adapted from frontend/src/pages/public/Home.jsx. Same building blocks
// as the web: match tabs (live/upcoming/completed) with a "See all", a
// tournament preview, three leaderboard boards, and a signed-in shortcut card
// ("Create your team" for a user without a team, "My team" for a captain).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mobileApi } from '../../api/mobile.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import { LanguageSwitcher, ThemeToggle } from '../../components/common/Controls.jsx';
import { TabStrip } from '../../components/common/Layout.jsx';
import Logo from '../../components/common/Logo.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import FeaturedStrip from '../../components/home/FeaturedStrip.jsx';
import TabbedSection from '../../components/home/TabbedSection.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import AutoCarousel from '../../components/notice/AutoCarousel.jsx';
import { NewsCard, NoticeCard } from '../../components/notice/NoticeBits.jsx';
import { LeaderboardList, StandingsTable, TournamentCard } from '../../components/tournament/TournamentBits.jsx';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { LEADERBOARD_CATEGORIES, PLAYER_ROLES, ROLES } from '../../utils/constants.js';

// Everything on this screen arrives in one response (GET /mobile/home), which
// the server has already trimmed — so these are about layout, not fetching.
const LEADER_LIMIT = 3;
// The whole screen is refetched on this cadence because of the live section;
// everything else in the payload is cheap and server-cached anyway.
const HOME_REFRESH_MS = 60_000;
const NOTICE_TAB = Object.freeze({ TOURNAMENTS: 'tournaments', NEWS: 'news' });
// Cards visible at once in the carousel.
const HOME_CARDS = 2;

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
// Every section below is handed what the one home request already decided.
// The server knows what is empty, so none of these re-derives it — and an
// absent section simply renders nothing rather than an empty state nobody
// needs to read.

// Live matches, and only when something is live. A "Live" strip sitting empty
// for most of the day is the first thing a reader sees and it says the app is
// dead; between matches the sections below take its place.
function LiveSection({ matches }) {
  const { t } = useTranslation();
  if (!matches?.length) return null;
  return (
    <Section title={t('match.tabLive')} actionTo="/matches" actionLabel={t('common.viewAll')}>
      <View style={styles.stack}>
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </View>
    </Section>
  );
}

// Who a first-time visitor might recognise. Second on the screen rather than
// first: during a live match the score comes before anything else — and
// because an empty section is not drawn, on a quiet day this is already the
// first thing anybody sees.
function FeaturedSection({ people }) {
  const { t } = useTranslation();
  if (!people?.length) return null;
  return (
    <Section title={t('home.featuredTitle')}>
      <FeaturedStrip people={people} />
    </Section>
  );
}

// Matches that are not live, by when they were played. Recent is the last
// twenty-four hours; completed is everything older, so no match is in both.
function MatchesSection({ matches }) {
  const { t } = useTranslation();
  const tabs = [
    { id: 'recent', label: t('home.tabRecent'), items: matches?.recent },
    { id: 'upcoming', label: t('match.tabUpcoming'), items: matches?.upcoming },
    { id: 'completed', label: t('match.tabCompleted'), items: matches?.completed },
  ];
  // Nothing in any tab: no heading, no "View all", nothing at all.
  if (!tabs.some((tab) => tab.items?.length)) return null;
  return (
    <Section title={t('home.matchesTitle')} actionTo="/matches" actionLabel={t('common.viewAll')}>
      <TabbedSection tabs={tabs} renderItem={(match) => <MatchCard match={match} />} />
    </Section>
  );
}

// The competitions KhelScore runs itself.
function TournamentsSection({ tournaments }) {
  const { t } = useTranslation();
  const tabs = [
    { id: 'ongoing', label: t('status.ongoing'), items: tournaments?.ongoing },
    { id: 'upcoming', label: t('notices.phaseUpcoming'), items: tournaments?.upcoming },
    { id: 'completed', label: t('notices.phaseCompleted'), items: tournaments?.completed },
  ];
  if (!tabs.some((tab) => tab.items?.length)) return null;
  return (
    <Section
      title={t('app.tournamentsSectionTitle')}
      actionTo="/tournaments"
      actionLabel={t('common.viewAll')}
    >
      <TabbedSection tabs={tabs} renderItem={(tournament) => <TournamentCard tournament={tournament} />} />
    </Section>
  );
}

// Tournaments other people are running, and Kabaddi news. Two cards at a time,
// moving on by themselves: a section on Home has to earn its height.
function NoticesSection({ openTournaments, news }) {
  const { t } = useTranslation();
  // Tournaments lead when there are any, and news when there are not — opening
  // on an empty tab while the other one has something is the whole reason the
  // rest of this screen hides what it cannot fill. A tab the reader picks is
  // theirs and is never overridden.
  const [chosen, setChosen] = useState(null);
  const tab = chosen ?? (openTournaments?.length ? NOTICE_TAB.TOURNAMENTS : NOTICE_TAB.NEWS);
  const tournaments = tab === NOTICE_TAB.TOURNAMENTS;
  const items = (tournaments ? openTournaments : news) ?? [];

  if (!openTournaments?.length && !news?.length) return null;

  return (
    <Section
      title={t('notices.sectionTitle')}
      actionTo="/notices"
      actionLabel={t('common.viewAll')}
    >
      <TabStrip
        label={t('notices.sectionTitle')}
        value={tab}
        onChange={setChosen}
        tabs={[
          { id: NOTICE_TAB.TOURNAMENTS, label: t('notices.tabTournaments') },
          { id: NOTICE_TAB.NEWS, label: t('notices.tabNews') },
        ]}
      />
      {items.length === 0 ? (
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

function LeadersSection({ topPlayers }) {
  const { t } = useTranslation();
  const boards = LEADERBOARD_CATEGORIES.filter((c) => topPlayers?.[c]?.entries?.length);
  if (boards.length === 0) return null;
  return (
    <Section title={t('home.leadersTitle')} actionTo="/rankings" actionLabel={t('common.viewAll')}>
      <View style={styles.stack}>
        {boards.map((category) => (
          <View key={category} style={styles.leaderBoard}>
            <AppText variant="label" tone="muted">
              {t(`rankings.category.${category}`)}
            </AppText>
            <LeaderboardList
              entries={topPlayers[category].entries.slice(0, LEADER_LIMIT)}
              category={category}
              compact
            />
          </View>
        ))}
      </View>
    </Section>
  );
}

function TopTeamsSection({ rows }) {
  const { t } = useTranslation();
  if (!rows?.length) return null;
  return (
    <Section title={t('home.topTeamsTitle')} actionTo="/rankings" actionLabel={t('common.viewAll')}>
      <StandingsTable rows={rows} />
    </Section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // One request for the whole screen. Refetched on the live cadence, because
  // the live section is the only part anybody minds being a minute old.
  const query = useQuery({
    queryKey: qk.home,
    queryFn: mobileApi.home,
    refetchInterval: HOME_REFRESH_MS,
  });
  const data = query.data;

  // Sections as list items, so the ones below the fold are not built until
  // they are scrolled to — six sections rendered up front is the difference
  // between Home appearing and Home taking a beat on a low-end phone.
  const sections = [
    { key: 'header', render: () => <Header /> },
    { key: 'shortcut', render: () => <TeamShortcut /> },
    { key: 'live', render: () => <LiveSection matches={data?.live} /> },
    { key: 'featured', render: () => <FeaturedSection people={data?.featured} /> },
    { key: 'matches', render: () => <MatchesSection matches={data?.matches} /> },
    { key: 'tournaments', render: () => <TournamentsSection tournaments={data?.tournaments} /> },
    {
      key: 'notices',
      render: () => <NoticesSection openTournaments={data?.openTournaments} news={data?.news} />,
    },
    { key: 'leaders', render: () => <LeadersSection topPlayers={data?.topPlayers} /> },
    { key: 'topTeams', render: () => <TopTeamsSection rows={data?.topTeams} /> },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      {query.isPending ? (
        <View style={styles.content}>
          <Header />
          <LoadingState />
        </View>
      ) : query.isError ? (
        <View style={styles.content}>
          <Header />
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(section) => section.key}
          renderItem={({ item }) => item.render()}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={null}
          accessibilityLabel={t('nav.home')}
        />
      )}
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
