// Tournaments announced by other people, and Kabaddi news from elsewhere.
// Two tabs because they are two different things that answer the same
// question: what Kabaddi is happening that I am not already part of?
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { newsFeedApi } from '../api/newsFeed.api.js';
import { noticesApi } from '../api/notices.api.js';
import { qk } from '../api/queryKeys.js';
import AppText from '../components/common/AppText.jsx';
import Button from '../components/common/Button.jsx';
import { TabStrip } from '../components/common/Layout.jsx';
import PagedList from '../components/common/PagedList.jsx';
import SelectSheetField from '../components/common/SelectSheetField.jsx';
import { NewsCard, NoticeCard } from '../components/notice/NoticeBits.jsx';
import { usePagedQuery } from '../hooks/usePagedQuery.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { SPACING } from '../theme/tokens.js';
import { useTheme } from '../theme/useTheme.js';

const PAGE_SIZE = 12;
const TAB = Object.freeze({ TOURNAMENTS: 'tournaments', NEWS: 'news' });
const PHASES = Object.freeze(['upcoming', 'running', 'completed']);
// How far back the year filter reaches. A notice cannot be announced more than
// a year ahead or a month behind, so a short list covers everything there is.
const YEARS_BACK = 4;

function yearOptions(label) {
  const now = new Date().getFullYear();
  return [
    { value: '', label },
    ...Array.from({ length: YEARS_BACK }, (_, i) => {
      const year = String(now - i);
      return { value: year, label: year };
    }),
  ];
}

function TournamentsTab({ phase, year }) {
  const { t } = useTranslation();
  const params = { phase, year };
  const query = usePagedQuery({
    queryKey: qk.notices.list({ ...params, limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => noticesApi.list({ ...params, page, limit: PAGE_SIZE }),
  });
  return (
    <PagedList
      query={query}
      items={query.items}
      renderItem={({ item }) => <NoticeCard notice={item} />}
      emptyTitle={t('notices.emptyTitle')}
      emptyHint={t('notices.emptyHint')}
    />
  );
}

function NewsTab() {
  const { t } = useTranslation();
  const query = usePagedQuery({
    queryKey: qk.newsFeed.list({ limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => newsFeedApi.list({ page, limit: PAGE_SIZE }),
  });
  return (
    <PagedList
      query={query}
      items={query.items}
      renderItem={({ item }) => <NewsCard item={item} />}
      emptyTitle={t('notices.newsEmptyTitle')}
      emptyHint={t('notices.newsEmptyHint')}
    />
  );
}

export default function Notices() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const [tab, setTab] = useState(TAB.TOURNAMENTS);
  const [phase, setPhase] = useState('upcoming');
  const [year, setYear] = useState('');

  const tournaments = tab === TAB.TOURNAMENTS;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <AppText variant="heading" accessibilityRole="header">
          {t('notices.sectionTitle')}
        </AppText>

        <TabStrip
          label={t('notices.sectionTitle')}
          value={tab}
          onChange={setTab}
          tabs={[
            { id: TAB.TOURNAMENTS, label: t('notices.tabTournaments') },
            { id: TAB.NEWS, label: t('notices.tabNews') },
          ]}
        />

        {/* The filters belong to the tournaments tab; news has one order and
            nothing to narrow it by. */}
        {tournaments ? (
          <>
            <TabStrip
              label={t('notices.tabTournaments')}
              value={phase}
              onChange={setPhase}
              tabs={PHASES.map((id) => ({
                id,
                label: t(`notices.phase${id[0].toUpperCase()}${id.slice(1)}`),
              }))}
            />
            <SelectSheetField
              label={t('notices.yearLabel')}
              value={year}
              onChange={setYear}
              options={yearOptions(t('notices.allYears'))}
            />
            {status === AUTH_STATUS.AUTHENTICATED ? (
              <Button variant="secondary" onPress={() => router.push('/notice/new')}>
                {t('notices.announce')}
              </Button>
            ) : null}
          </>
        ) : null}
      </View>

      {/* Each tab owns its own query, so switching does not refetch the other
          and the lists keep their place. */}
      {tournaments ? <TournamentsTab phase={phase} year={year} /> : <NewsTab />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
});
