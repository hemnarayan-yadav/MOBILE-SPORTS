// Tournaments — adapted from frontend/src/pages/public/Tournaments.jsx: search,
// status filter, infinite list.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { qk } from '../../api/queryKeys.js';
import { tournamentsApi } from '../../api/tournaments.api.js';
import AppText from '../../components/common/AppText.jsx';
import { TabStrip } from '../../components/common/Layout.jsx';
import PagedList from '../../components/common/PagedList.jsx';
import SearchField from '../../components/common/SearchField.jsx';
import { TournamentCard } from '../../components/tournament/TournamentBits.jsx';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';

const PAGE_SIZE = 12;
const FILTERS = Object.freeze(['all', 'ongoing', 'registration_open', 'completed']);

export default function Tournaments() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, status: filter === 'all' ? '' : filter };
  const query = usePagedQuery({
    queryKey: qk.tournaments.list({ ...params, limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => tournamentsApi.list({ ...params, page, limit: PAGE_SIZE }),
  });

  const header = (
    <View style={styles.header}>
      <AppText variant="heading" accessibilityRole="header">
        {t('tournament.pageTitle')}
      </AppText>
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder={t('tournament.searchPlaceholder')}
      />
      <TabStrip
        label={t('tournament.pageTitle')}
        value={filter}
        onChange={setFilter}
        tabs={FILTERS.map((id) => ({
          id,
          label: id === 'all' ? t('common.all') : t(`status.${id}`),
        }))}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <PagedList
        query={query}
        items={query.items}
        renderItem={({ item }) => <TournamentCard tournament={item} />}
        header={header}
        emptyTitle={t('tournament.emptyTitle')}
        emptyHint={t('tournament.emptyHint')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: SPACING.sm, marginBottom: SPACING.xs },
});
