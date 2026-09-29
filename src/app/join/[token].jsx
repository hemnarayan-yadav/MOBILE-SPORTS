// /join/:token — an invitation link. Ported from the JoinWithToken half of
// frontend/src/pages/public/JoinTeam.jsx.
//
// The token only shows the invitation; it grants nothing on its own. Kept for
// links already delivered and for a captain sharing one by hand; the WhatsApp
// message itself no longer carries a token.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { invitationsApi } from '../../api/invitations.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import Screen from '../../components/common/Screen.jsx';
import { ErrorState, LoadingState } from '../../components/common/States.jsx';
import JoinActions, { useAcceptInvitations } from '../../components/team/JoinActions.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { SPACING } from '../../theme/tokens.js';
import { formatDate } from '../../utils/format.js';

const STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
});
// Answers meaning "this link is not a valid invitation" (unknown, replaced or
// malformed token). Anything else (network, server) can be retried.
const INVALID_LINK_STATUSES = new Set([400, 404]);

export default function JoinWithToken() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();

  const previewKey = qk.invitations.preview(token);
  const invitation = useQuery({
    // Seen signed out and signed in, the same link says different things.
    queryKey: [...previewKey, user?.id ?? null],
    queryFn: () => invitationsApi.preview(token),
    enabled: Boolean(token),
  });
  const accept = useAcceptInvitations(() =>
    queryClient.invalidateQueries({ queryKey: previewKey }),
  );

  if (invitation.isPending) {
    return (
      <Screen title={t('join.title')}>
        <LoadingState />
      </Screen>
    );
  }
  if (invitation.isError) {
    return (
      <Screen title={t('join.title')}>
        {INVALID_LINK_STATUSES.has(invitation.error?.status) ? (
          <AppText accessibilityLiveRegion="polite">{t('join.invalid')}</AppText>
        ) : (
          <ErrorState error={invitation.error} onRetry={() => invitation.refetch()} />
        )}
      </Screen>
    );
  }

  const data = invitation.data;
  const teamName = data.team?.name ?? '';
  const teamPath = data.team?.id ? `/team/${data.team.id}` : '/teams';
  const viewTeam = (
    <Button variant="secondary" onPress={() => router.push(teamPath)}>
      {t('join.viewTeam')}
    </Button>
  );

  // Accepted by someone else (or the viewer is signed out): no "you are in".
  if (data.status === STATUS.ACCEPTED && !data.forCurrentUser) {
    return (
      <Screen title={t('join.title')} subtitle={t('join.alreadyAccepted', { team: teamName })}>
        <View style={styles.stack}>
          {!isAuthenticated ? (
            <Button onPress={() => router.push('/auth/login')}>{t('join.signIn')}</Button>
          ) : null}
          {viewTeam}
        </View>
      </Screen>
    );
  }
  if (data.status === STATUS.ACCEPTED) {
    return (
      <Screen title={t('join.acceptedTitle')} subtitle={t('join.acceptedText', { team: teamName })}>
        {viewTeam}
      </Screen>
    );
  }
  if (data.status !== STATUS.PENDING) {
    return (
      <Screen title={t('join.title')}>
        <AppText accessibilityLiveRegion="polite">
          {t(data.status === STATUS.EXPIRED ? 'join.expired' : 'join.cancelled', {
            team: teamName,
          })}
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen
      title={t('join.pendingTitle', { team: teamName })}
      subtitle={t('join.invitedBy', {
        captain: data.invitedBy,
        player: data.playerName,
        team: teamName,
      })}
    >
      <View style={styles.stack}>
        <AppText variant="small" tone="muted">
          {`${t('join.sentTo')}: ${data.phone}`}
        </AppText>
        <AppText variant="small" tone="muted">
          {`${t('join.expiresOn')}: ${formatDate(data.expiresAt)}`}
        </AppText>
      </View>
      <JoinActions
        otherNumber={isAuthenticated && Boolean(user?.phone) && !data.forCurrentUser}
        accepting={accept.isPending}
        onConfirm={accept.mutate}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.xs },
});
