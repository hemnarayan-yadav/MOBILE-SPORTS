// Ported from frontend/src/pages/dashboard/captain/TeamInvitations.jsx.
//
// The invitations that were sent before inviting was retired. A captain can no
// longer create or resend one — the API has no such endpoint any more — so this
// is read-only apart from cancelling, which frees the squad place. The invited
// player can still accept (app/join). Nothing is shown at all once the list is
// empty, which is how every team ends up after the change.
//
// `onSquadChanged` refreshes the squad after a cancellation.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { invitationsApi } from '../../api/invitations.api.js';
import { qk } from '../../api/queryKeys.js';
import { openInvitations } from '../../hooks/useTeamInvitations.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import { formatPhone } from '../../utils/countries.js';
import { formatDate } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { Card } from '../common/Layout.jsx';
import { ErrorState } from '../common/States.jsx';

function InvitationRow({ invitation, onCancel }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const expired = invitation.status === 'expired';
  const name = invitation.player?.name ?? '';
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.head}>
        <AppText weight="semibold" numberOfLines={1} style={styles.flex}>
          {name}
        </AppText>
        <Badge tone={expired ? 'warning' : 'info'}>
          {t(`teamInvite.status.${invitation.status}`)}
        </Badge>
      </View>
      <AppText variant="small" tone="muted">
        {formatPhone(invitation.phone)}
      </AppText>
      {!expired ? (
        <AppText variant="small" tone="muted">
          {t('teamInvite.expires', { date: formatDate(invitation.expiresAt) })}
        </AppText>
      ) : null}
      <Button
        variant="ghost"
        accessibilityLabel={t('teamInvite.cancelFor', { name })}
        onPress={() => onCancel(invitation)}
      >
        {t('teamInvite.cancel')}
      </Button>
    </View>
  );
}

export default function TeamInvitations({ teamId, query, onSquadChanged }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(null);
  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: qk.invitations.team(teamId) });

  const cancel = useMutation({
    mutationFn: (invitation) => invitationsApi.cancel(teamId, invitation.id),
    onSuccess: (invitation) => {
      notify.success(t('teamInvite.cancelled', { name: invitation.player?.name }));
      setCancelling(null);
      refreshList();
      onSquadChanged();
    },
    onError: (error) => {
      setCancelling(null);
      notify.error(apiErrorText(t, error));
      refreshList();
      onSquadChanged();
    },
  });

  const open = openInvitations(query.data);
  // A team with nothing left over from the old flow sees no section at all.
  if (query.isPending || (!query.isError && open.length === 0)) return null;

  return (
    <View style={styles.section}>
      <AppText variant="title" display accessibilityRole="header">
        {t('teamInvite.title')}
      </AppText>
      <AppText variant="small" tone="muted">
        {t('teamInvite.subtitle')}
      </AppText>
      <Card>
        {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
        {open.map((invitation) => (
          <InvitationRow key={invitation.id} invitation={invitation} onCancel={setCancelling} />
        ))}
      </Card>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={t('teamInvite.cancelTitle')}
        message={t('teamInvite.cancelConfirm', { name: cancelling?.player?.name })}
        confirmLabel={t('teamInvite.cancel')}
        loading={cancel.isPending}
        onCancel={() => !cancel.isPending && setCancelling(null)}
        onConfirm={() => !cancel.isPending && cancel.mutate(cancelling)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.xs },
  row: {
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1 },
});
