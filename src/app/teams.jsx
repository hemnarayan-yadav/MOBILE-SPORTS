// Teams — adapted from frontend/src/pages/public/Teams.jsx: search and an
// infinite list.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { qk } from '../api/queryKeys.js';
import { teamsApi } from '../api/teams.api.js';
import { BackHeader } from '../components/common/Layout.jsx';
import PagedList from '../components/common/PagedList.jsx';
import SearchField from '../components/common/SearchField.jsx';
import StateDistrictFields from '../components/common/StateDistrictFields.jsx';
import { TeamCard } from '../components/team/TeamBits.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { usePagedQuery } from '../hooks/usePagedQuery.js';
import { SPACING } from '../theme/tokens.js';
import { useTheme } from '../theme/useTheme.js';

const PAGE_SIZE = 12;

export default function Teams() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState({ state: '', district: '' });
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, state: location.state, district: location.district };
  const query = usePagedQuery({
    queryKey: qk.teams.list({ ...params, limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => teamsApi.list({ ...params, page, limit: PAGE_SIZE }),
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <PagedList
        query={query}
        items={query.items}
        renderItem={({ item }) => <TeamCard team={item} />}
        header={
          <View style={styles.header}>
            <BackHeader title={t('team.pageTitle')} />
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('team.searchPlaceholder')}
            />
            <StateDistrictFields
              variant="filter"
              state={location.state}
              district={location.district}
              onChange={setLocation}
            />
          </View>
        }
        emptyTitle={t('team.emptyTitle')}
        emptyHint={t('team.emptyHint')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: SPACING.sm, marginBottom: SPACING.xs },
});
