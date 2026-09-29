// The team's matches — adapted from CaptainMatches in
// frontend/src/pages/dashboard/captain/CaptainPages.jsx. The web pages through
// numbered pages; the app loads the next page as the list is scrolled, like its
// other lists.
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import Button from '../../components/common/Button.jsx';
import { BackHeader, TabStrip } from '../../components/common/Layout.jsx';
import PagedList from '../../components/common/PagedList.jsx';
import { EmptyState } from '../../components/common/States.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { MATCH_STATUS } from '../../utils/constants.js';

const PAGE_SIZE = 12;
const TABS = [MATCH_STATUS.UPCOMING, MATCH_STATUS.LIVE, MATCH_STATUS.COMPLETED];

export default function CaptainMatches() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const teamId = useAuthStore((s) => s.user?.teamId);
  const [tab, setTab] = useState(MATCH_STATUS.UPCOMING);

  const params = { team: teamId, status: tab, limit: PAGE_SIZE };
  const query = usePagedQuery({
    queryKey: qk.matches.list(params),
    fetchPage: ({ page }) => matchesApi.list({ ...params, page }),
    enabled: Boolean(teamId),
  });

  if (status === AUTH_STATUS.ANONYMOUS) return <Redirect href="/auth/login" />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.head}>
        <BackHeader title={t('nav.teamMatches')} />
        <TabStrip
          label={t('nav.teamMatches')}
          value={tab}
          onChange={setTab}
          tabs={TABS.map((id) => ({ id, label: t(`status.${id}`) }))}
        />
      </View>
      {teamId ? (
        <PagedList
          query={query}
          items={query.items}
          renderItem={({ item }) => <MatchCard match={item} />}
          emptyTitle={t(`match.empty.${tab}`)}
          header={
            <Button variant="secondary" onPress={() => router.push(`/team/${teamId}`)}>
              {t('captain.teamStats')}
            </Button>
          }
        />
      ) : (
        <EmptyState title={t('captain.noTeam')} hint={t('captain.noTeamHint')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  head: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.sm },
});
