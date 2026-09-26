// Home — adapted from the match grid of frontend/src/pages/public/Home.jsx:
// live, upcoming and last-24-hours matches, with the language and theme
// switches and the way to sign in or to the account.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import { LanguageSwitcher, ThemeToggle } from '../../components/common/Controls.jsx';
import { TabStrip } from '../../components/common/Layout.jsx';
import Logo from '../../components/common/Logo.jsx';
import PagedList from '../../components/common/PagedList.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { MATCH_STATUS } from '../../utils/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const LIMIT = 20;
// Same cadence as the web home page; the list pauses in the background
// (lib/appLifecycle.js) and a pull refreshes it at once. An open match is
// pushed live over its socket.
const LIVE_REFRESH_MS = 60_000;
const TABS = Object.freeze([MATCH_STATUS.LIVE, MATCH_STATUS.UPCOMING, MATCH_STATUS.COMPLETED]);

// Signed in: the account (profile). Signed out: sign in. Nothing while the
// stored session is still being restored, so the label never flickers.
function AccountButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  if (status === AUTH_STATUS.UNKNOWN) return null;
  const signedIn = status === AUTH_STATUS.AUTHENTICATED;
  return (
    <Button
      variant="secondary"
      onPress={() => router.push(signedIn ? '/dashboard/profile' : '/auth/login')}
    >
      {signedIn ? t('app.account') : t('nav.login')}
    </Button>
  );
}

function Header({ tab, onTab }) {
  const { t } = useTranslation();
  const router = useRouter();
  const tabs = TABS.map((id) => ({
    id,
    label:
      id === MATCH_STATUS.COMPLETED
        ? t('home.tabCompleted24h')
        : t(`match.tab${id[0].toUpperCase()}${id.slice(1)}`),
  }));
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Logo height={30} title={t('nav.brand')} />
        <View style={styles.controls}>
          <LanguageSwitcher />
          <ThemeToggle />
        </View>
      </View>
      <View style={styles.row}>
        <AppText variant="title" accessibilityRole="header">
          {t(tab === MATCH_STATUS.LIVE ? 'home.liveNow' : 'home.matchesTitle')}
        </AppText>
        <AccountButton />
      </View>
      <TabStrip tabs={tabs} value={tab} onChange={onTab} label={t('home.matchesTitle')} />
      <Button variant="ghost" onPress={() => router.push('/matches')}>
        {`${t('common.viewAll')} ›`}
      </Button>
    </View>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tab, setTab] = useState(MATCH_STATUS.LIVE);
  const params = useMemo(
    () =>
      tab === MATCH_STATUS.COMPLETED
        ? { status: tab, from: new Date(Date.now() - DAY_MS).toISOString(), limit: LIMIT }
        : { status: tab, limit: LIMIT },
    [tab],
  );
  const query = useQuery({
    queryKey: qk.matches.list(params),
    queryFn: () => matchesApi.list(params),
    refetchInterval: tab === MATCH_STATUS.LIVE ? LIVE_REFRESH_MS : false,
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <PagedList
        query={query}
        items={query.data?.items ?? []}
        renderItem={({ item }) => <MatchCard match={item} />}
        header={<Header tab={tab} onTab={setTab} />}
        emptyTitle={t(`match.empty.${tab}`)}
        emptyHint={t('match.emptyHint')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: SPACING.md, marginBottom: SPACING.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', gap: SPACING.sm },
});
