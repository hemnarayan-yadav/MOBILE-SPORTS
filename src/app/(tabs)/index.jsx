// Home — adapted from frontend/src/pages/public/Home.jsx. Same building blocks
// as the web: match tabs (live/upcoming/completed) with a "See all", a
// tournament preview, three leaderboard boards, and a signed-in shortcut card
// ("Create your team" for a user without a team, "My team" for a captain).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi, rankingsApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import { tournamentsApi } from '../../api/tournaments.api.js';
import AppText from '../../components/common/AppText.jsx';
import { LanguageSwitcher, ThemeToggle } from '../../components/common/Controls.jsx';
import { TabStrip } from '../../components/common/Layout.jsx';
import Logo from '../../components/common/Logo.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import { LeaderboardList, TournamentCard } from '../../components/tournament/TournamentBits.jsx';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { LEADERBOARD_CATEGORIES, MATCH_STATUS, ROLES } from '../../utils/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// A short preview on Home keeps the payload light on low-end Androids — full
// lists live on the tab screens (paged).
const PREVIEW_LIMIT = 5;
const TOURNAMENT_LIMIT = 4;
const LEADER_LIMIT = 3;
// The live block matches the web's cadence; an open match page is pushed live
// over its socket.
const LIVE_REFRESH_MS = 60_000;
const TABS = Object.freeze([MATCH_STATUS.LIVE, MATCH_STATUS.UPCOMING, MATCH_STATUS.COMPLETED]);

// A person icon when signed in (goes to the profile), a login icon when signed
// out (goes to sign-in). Nothing while the stored session is still being
// restored, so the icon does not flicker.
function AccountIconButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const status = useAuthStore((s) => s.status);
  if (status === AUTH_STATUS.UNKNOWN) return null;
  const signedIn = status === AUTH_STATUS.AUTHENTICATED;
  const iconName = signedIn ? 'person-circle-outline' : 'log-in-outline';
  const label = t(signedIn ? 'app.accountLabel' : 'app.signInLabel');
  return (
    <Pressable
      onPress={() => router.push(signedIn ? '/dashboard/profile' : '/auth/login')}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.iconButton, { backgroundColor: colors.surface2 }]}
    >
      <Ionicons name={iconName} size={22} color={colors.text} />
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

function MatchesSection() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(MATCH_STATUS.LIVE);
  const params = useMemo(
    () =>
      tab === MATCH_STATUS.COMPLETED
        ? { status: tab, from: new Date(Date.now() - DAY_MS).toISOString(), limit: PREVIEW_LIMIT }
        : { status: tab, limit: PREVIEW_LIMIT },
    [tab],
  );
  const query = useQuery({
    queryKey: qk.matches.list(params),
    queryFn: () => matchesApi.list(params),
    refetchInterval: tab === MATCH_STATUS.LIVE ? LIVE_REFRESH_MS : false,
  });
  const tabs = TABS.map((id) => ({
    id,
    label:
      id === MATCH_STATUS.COMPLETED
        ? t('home.tabCompleted24h')
        : t(`match.tab${id[0].toUpperCase()}${id.slice(1)}`),
  }));
  return (
    <Section title={t('home.matchesTitle')} actionTo="/matches" actionLabel={t('common.viewAll')}>
      <TabStrip tabs={tabs} value={tab} onChange={setTab} label={t('home.matchesTitle')} />
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (query.data?.items ?? []).length === 0 ? (
        <EmptyState title={t(`match.empty.${tab}`)} hint={t('match.emptyHint')} />
      ) : (
        <View style={styles.stack}>
          {(query.data?.items ?? []).slice(0, PREVIEW_LIMIT).map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </View>
      )}
    </Section>
  );
}

function TournamentsSection() {
  const { t } = useTranslation();
  const params = { limit: TOURNAMENT_LIMIT };
  const query = useQuery({
    queryKey: qk.tournaments.list(params),
    queryFn: () => tournamentsApi.list(params),
  });
  return (
    <Section
      title={t('app.tournamentsSectionTitle')}
      actionTo="/tournaments"
      actionLabel={t('common.viewAll')}
    >
      {query.isPending ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (query.data?.items ?? []).length === 0 ? (
        <EmptyState title={t('app.tournamentsEmpty')} hint={t('app.tournamentsEmptyHint')} />
      ) : (
        <View style={styles.stack}>
          {(query.data?.items ?? []).slice(0, TOURNAMENT_LIMIT).map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </View>
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
        <MatchesSection />
        <TournamentsSection />
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
