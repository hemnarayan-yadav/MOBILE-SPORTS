// The frame every captain screen shares: the signed-in check, the team with its
// squad, and the states around it. It takes the place of the website's
// <RoleRoute roles={[captain]}> plus its <TeamGate> — routing in the app is
// file-based, so the guard lives in the screen.
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCaptainTeam } from '../../hooks/useCaptainTeam.js';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { ROLES, TEAM_STATUS } from '../../utils/constants.js';
import AppText from '../common/AppText.jsx';
import Button from '../common/Button.jsx';
import { BackHeader } from '../common/Layout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../common/States.jsx';

// Why the team cannot be changed right now. A Super Admin deactivation locks
// the captain out of switching it back on.
export function LockedNotice({ team }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (team.status !== TEAM_STATUS.INACTIVE) return null;
  const locked = team.deactivatedByRole === ROLES.SUPER_ADMIN;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: colors.surface2, borderColor: colors.border }]}
    >
      <AppText variant="small" tone={locked ? 'danger' : 'warning'}>
        {t(locked ? 'captain.lockedBySuperAdmin' : 'captain.inactiveNotice')}
      </AppText>
    </View>
  );
}

export default function CaptainScreen({ title, subtitle, header, children }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const { teamId, data: team, isPending, isError, error, refetch } = useCaptainTeam();

  if (status === AUTH_STATUS.ANONYMOUS) return <Redirect href="/auth/login" />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackHeader title={title} />
        {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
        {header}
        {status === AUTH_STATUS.UNKNOWN ? <LoadingState /> : null}
        {status === AUTH_STATUS.AUTHENTICATED && !teamId ? (
          <>
            <EmptyState title={t('captain.noTeam')} hint={t('captain.noTeamHint')} />
            {role === ROLES.USER ? (
              <Button onPress={() => router.push('/user/create-team')}>
                {t('team.createSubmit')}
              </Button>
            ) : null}
          </>
        ) : null}
        {teamId && isPending ? <LoadingState /> : null}
        {teamId && isError ? <ErrorState error={error} onRetry={() => refetch()} /> : null}
        {team ? children(team) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  notice: { borderWidth: 1, borderRadius: RADII.xl, padding: SPACING.md },
});
