// Following — adapted from frontend/src/pages/dashboard/Following.jsx: the
// teams, tournaments and matches the account follows, each with its button.
import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { followsApi } from '../../api/follows.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import FollowButton from '../../components/common/FollowButton.jsx';
import { BackHeader, Card, Section } from '../../components/common/Layout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import TeamCrest from '../../components/team/TeamCrest.jsx';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { formatDateTime } from '../../utils/format.js';

function FollowRow({ to, title, subtitle, leading, targetType, targetId }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {leading}
      <Pressable onPress={() => router.push(to)} accessibilityRole="link" style={styles.flex}>
        <AppText weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </Pressable>
      <FollowButton targetType={targetType} targetId={targetId} />
    </View>
  );
}

function Lists({ data }) {
  const { t } = useTranslation();
  return (
    <>
      {data.team.length > 0 ? (
        <Section title={t('nav.teams')}>
          <Card>
            {data.team.map((team) => (
              <FollowRow
                key={team.id}
                to={`/team/${team.id}`}
                title={team.name}
                subtitle={team.shortName}
                leading={<TeamCrest team={team} size="sm" />}
                targetType="team"
                targetId={team.id}
              />
            ))}
          </Card>
        </Section>
      ) : null}
      {data.tournament.length > 0 ? (
        <Section title={t('nav.tournaments')}>
          <Card>
            {data.tournament.map((tournament) => (
              <FollowRow
                key={tournament.id}
                to={`/tournament/${tournament.id}`}
                title={tournament.name}
                subtitle={tournament.season}
                leading={<StatusBadge status={tournament.status} />}
                targetType="tournament"
                targetId={tournament.id}
              />
            ))}
          </Card>
        </Section>
      ) : null}
      {data.match.length > 0 ? (
        <Section title={t('nav.matches')}>
          <Card>
            {data.match.map((match) => (
              <FollowRow
                key={match.id}
                to={`/match/${match.id}`}
                title={`${match.teamA?.name ?? '—'} ${t('match.vs')} ${match.teamB?.name ?? '—'}`}
                subtitle={formatDateTime(match.scheduledAt)}
                leading={<StatusBadge status={match.status} />}
                targetType="match"
                targetId={match.id}
              />
            ))}
          </Card>
        </Section>
      ) : null}
    </>
  );
}

export default function Following() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const query = useQuery({
    queryKey: qk.follows.list,
    queryFn: followsApi.list,
    enabled: status === AUTH_STATUS.AUTHENTICATED,
  });

  if (status === AUTH_STATUS.ANONYMOUS) return <Redirect href="/auth/login" />;
  const data = query.data;
  const isEmpty = data && !data.team.length && !data.tournament.length && !data.match.length;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader title={t('following.title')} />
        <AppText tone="muted">{t('following.subtitle')}</AppText>
        {status === AUTH_STATUS.UNKNOWN || query.isPending ? <LoadingState /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
        {isEmpty ? (
          <>
            <EmptyState title={t('following.empty')} hint={t('following.emptyHint')} />
            <Button onPress={() => router.push('/teams')}>{t('following.browseTeams')}</Button>
          </>
        ) : null}
        {data && !isEmpty ? <Lists data={data} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 56 },
});
