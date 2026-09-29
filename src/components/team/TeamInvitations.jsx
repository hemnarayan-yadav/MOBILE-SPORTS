// Ported from frontend/src/pages/dashboard/captain/TeamInvitations.jsx.
//
// Pending and expired invitations of the captain's team, with their WhatsApp
// delivery state. Resending asks the API for a new link (the old one stops
// working); cancelling frees the squad slot. `onSquadChanged` refreshes the
// squad after a cancellation.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { invitationsApi } from '../../api/invitations.api.js';
import { qk } from '../../api/queryKeys.js';
import { IN_FLIGHT, isInFlight, openInvitations } from '../../hooks/useTeamInvitations.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { formatPhone } from '../../utils/countries.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import ConfirmDialog from '../common/ConfirmDialog.jsx';
import { Card } from '../common/Layout.jsx';
import { ErrorState, LoadingState } from '../common/States.jsx';

// Delivery failures that sending again will not fix (the number cannot get
// WhatsApp messages). Shown as a plain message, never as the provider's code.
//
// The website words "sent" as a relative time; the app spells the time out
// instead, because Hermes has no `Intl.RelativeTimeFormat` (noted in M0). The
// sentence is the web's own `teamInvite.delivery.sent`, unchanged.
const UNDELIVERABLE = new Set(['contact_blocked', 'send_error', 'validation_error']);

function DeliveryLine({ delivery }) {
  const { t } = useTranslation();
  if (!delivery || delivery.status === 'cancelled') {
    return (
      <AppText variant="small" tone="muted">
        {t('teamInvite.delivery.none')}
      </AppText>
    );
  }
  if (IN_FLIGHT.has(delivery.status)) {
    return (
      <AppText variant="small" tone="muted">
        {t('teamInvite.delivery.sending')}
      </AppText>
    );
  }
  if (delivery.status === 'sent') {
    return (
      <AppText variant="small" tone="muted">
        {t('teamInvite.delivery.sent', { when: formatDateTime(delivery.sentAt) })}
      </AppText>
    );
  }
  return (
    <AppText variant="small" tone="danger">
      {t(
        UNDELIVERABLE.has(delivery.error)
          ? 'teamInvite.delivery.undeliverable'
          : 'teamInvite.delivery.failed',
      )}
    </AppText>
  );
}

function InvitationRow({ invitation, onResend, resending, onCancel }) {
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
      <DeliveryLine delivery={invitation.delivery} />
      {!expired ? (
        <AppText variant="small" tone="muted">
          {t('teamInvite.expires', { date: formatDate(invitation.expiresAt) })}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button
          variant="secondary"
          style={styles.flex}
          loading={resending}
          disabled={isInFlight(invitation)}
          accessibilityLabel={t('teamInvite.resendFor', { name })}
          onPress={() => onResend(invitation)}
        >
          {t('teamInvite.resend')}
        </Button>
        <Button
          variant="ghost"
          style={styles.flex}
          accessibilityLabel={t('teamInvite.cancelFor', { name })}
          onPress={() => onCancel(invitation)}
        >
          {t('teamInvite.cancel')}
        </Button>
      </View>
    </View>
  );
}

export default function TeamInvitations({ teamId, query, onSquadChanged }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(null);
  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: qk.invitations.team(teamId) });
  const onError = (error) => {
    notify.error(t(apiErrorKey(error)));
    refreshList();
  };

  const resend = useMutation({
    mutationFn: (invitation) => invitationsApi.resend(teamId, invitation.id),
    onSuccess: (invitation) => {
      notify.success(t('teamInvite.resent', { name: invitation.player?.name }));
      refreshList();
    },
    onError,
  });
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
      onError(error);
      onSquadChanged();
    },
  });

  const open = openInvitations(query.data);
  return (
    <View style={styles.section}>
      <AppText variant="title" display accessibilityRole="header">
        {t('teamInvite.title')}
      </AppText>
      <AppText variant="small" tone="muted">
        {t('teamInvite.subtitle')}
      </AppText>
      <Card>
        {query.isPending ? <LoadingState /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
        {!query.isPending && !query.isError && open.length === 0 ? (
          <AppText variant="small" tone="muted">
            {t('teamInvite.empty')}
          </AppText>
        ) : null}
        {open.map((invitation) => (
          <InvitationRow
            key={invitation.id}
            invitation={invitation}
            resending={resend.isPending && resend.variables?.id === invitation.id}
            onResend={(target) => !resend.isPending && resend.mutate(target)}
            onCancel={setCancelling}
          />
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
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
});
