// Home — Phase M0 placeholder: the live matches, with the language and theme
// switches. The full home screen (upcoming, results, tabs) arrives in Phase M2.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi } from '../api/matches.api.js';
import { qk } from '../api/queryKeys.js';
import AppText from '../components/common/AppText.jsx';
import { LanguageSwitcher, ThemeToggle } from '../components/common/Controls.jsx';
import Logo from '../components/common/Logo.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/common/States.jsx';
import MatchCard from '../components/match/MatchCard.jsx';
import { SPACING } from '../theme/tokens.js';
import { useTheme } from '../theme/useTheme.js';
import { MATCH_STATUS } from '../utils/constants.js';

// Same cadence as the web home page; the list pauses in the background
// (lib/appLifecycle.js) and a pull refreshes it at once.
const LIVE_REFRESH_MS = 60_000;
const LIVE_PARAMS = Object.freeze({ status: MATCH_STATUS.LIVE, limit: 20 });

function Header() {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Logo height={30} title={t('nav.brand')} />
        <View style={styles.controls}>
          <LanguageSwitcher />
          <ThemeToggle />
        </View>
      </View>
      <AppText variant="title" accessibilityRole="header">
        {t('home.liveNow')}
      </AppText>
    </View>
  );
}

function ListStatus({ query }) {
  const { t } = useTranslation();
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <EmptyState title={t('match.empty.live')} hint={t('match.emptyHint')} />;
}

export default function Home() {
  const { colors } = useTheme();
  const [pulling, setPulling] = useState(false);
  const live = useQuery({
    queryKey: qk.matches.list(LIVE_PARAMS),
    queryFn: () => matchesApi.list(LIVE_PARAMS),
    refetchInterval: LIVE_REFRESH_MS,
  });

  // Only a pull shows the spinner; the background refresh stays silent.
  const onRefresh = async () => {
    setPulling(true);
    try {
      await live.refetch();
    } finally {
      setPulling(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <FlatList
        data={live.data?.items ?? []}
        keyExtractor={(match) => match.id}
        renderItem={({ item }) => <MatchCard match={item} />}
        ListHeaderComponent={Header}
        ListEmptyComponent={<ListStatus query={live} />}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={onRefresh}
            colors={[colors.brand]}
            progressBackgroundColor={colors.surface}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md },
  header: { gap: SPACING.lg, marginBottom: SPACING.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', gap: SPACING.sm },
});
