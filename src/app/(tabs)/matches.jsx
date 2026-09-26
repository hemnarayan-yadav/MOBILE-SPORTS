// Matches — adapted from frontend/src/pages/public/Matches.jsx: live, upcoming
// and completed, as an infinite list instead of numbered pages.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import { TabStrip } from '../../components/common/Layout.jsx';
import PagedList from '../../components/common/PagedList.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { MATCH_STATUS } from '../../utils/constants.js';

const PAGE_SIZE = 12;
// Live cards refresh once a minute; an open match is pushed live over its socket.
const LIVE_REFRESH_MS = 60_000;
const TABS = Object.freeze([MATCH_STATUS.LIVE, MATCH_STATUS.UPCOMING, MATCH_STATUS.COMPLETED]);

export default function Matches() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [status, setStatus] = useState(MATCH_STATUS.LIVE);
  const query = usePagedQuery({
    queryKey: qk.matches.list({ status, limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => matchesApi.list({ status, page, limit: PAGE_SIZE }),
    refetchInterval: status === MATCH_STATUS.LIVE ? LIVE_REFRESH_MS : false,
  });

  const header = (
    <View style={styles.header}>
      <AppText variant="heading" accessibilityRole="header">
        {t('match.pageTitle')}
      </AppText>
      <AppText tone="muted">{t('match.pageSubtitle')}</AppText>
      <TabStrip
        label={t('match.pageTitle')}
        value={status}
        onChange={setStatus}
        tabs={TABS.map((id) => ({ id, label: t(`match.tab${id[0].toUpperCase()}${id.slice(1)}`) }))}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <PagedList
        query={query}
        items={query.items}
        renderItem={({ item }) => <MatchCard match={item} />}
        header={header}
        emptyTitle={t(`match.empty.${status}`)}
        emptyHint={t('match.emptyHint')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: SPACING.sm, marginBottom: SPACING.xs },
});
