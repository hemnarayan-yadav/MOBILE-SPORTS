// Ported from frontend/src/pages/dashboard/captain/TeamJoinRequests.jsx.
//
// What the squad has asked for: who was asked, on which number, and what they
// said. A captain's add asks the player first, so the add they just made sits
// here until it is answered — and withdrawing it is the only thing to do from
// here, since nothing was held in the squad. Nothing is shown at all while
// there is nothing waiting.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { qk } from '../../api/queryKeys.js';
import { teamsApi } from '../../api/teams.api.js';
import { shownRequests } from '../../hooks/useTeamJoinRequests.js';
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

// A request still open is one the captain can withdraw.
const OPEN = new Set(['pending', 'expired']);
const TONES = Object.freeze({ pending: 'info', expired: 'warning', rejected: 'danger' });

function RequestRow({ request, onCancel }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = request.player?.name ?? '';
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.head}>
        <AppText weight="semibold" numberOfLines={1} style={styles.flex}>
          {name}
        </AppText>
        <Badge tone={TONES[request.status] ?? 'neutral'}>
          {t(`joinRequest.status.${request.status}`)}
        </Badge>
        <Badge>{t('joinRequest.jersey', { number: request.jerseyNumber })}</Badge>
      </View>
      <AppText variant="small" tone="muted">
        {formatPhone(request.phone)}
      </AppText>
      {request.status === 'pending' ? (
        <AppText variant="small" tone="muted">
          {t('joinRequest.expires', { date: formatDate(request.expiresAt) })}
        </AppText>
      ) : null}
      {OPEN.has(request.status) ? (
        <Button
          variant="ghost"
          accessibilityLabel={t('joinRequest.cancelFor', { name })}
          onPress={() => onCancel(request)}
        >
          {t('joinRequest.cancel')}
        </Button>
      ) : null}
    </View>
  );
}

export default function TeamJoinRequests({ teamId, query }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(null);
  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: qk.joinRequests.team(teamId) });

  const cancel = useMutation({
    mutationFn: (request) => teamsApi.cancelJoinRequest(teamId, request.id),
    onSuccess: (request) => {
      notify.success(t('joinRequest.cancelled', { name: request.player?.name ?? '' }));
      setCancelling(null);
      refreshList();
    },
    onError: (error) => {
      setCancelling(null);
      notify.error(apiErrorText(t, error));
      refreshList();
    },
  });

  const requests = shownRequests(query.data);
  if (query.isPending || (!query.isError && requests.length === 0)) return null;

  return (
    <View style={styles.section}>
      <AppText variant="title" display accessibilityRole="header">
        {t('joinRequest.teamTitle')}
      </AppText>
      <AppText variant="small" tone="muted">
        {t('joinRequest.teamSubtitle')}
      </AppText>
      <Card>
        {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
        {requests.map((request) => (
          <RequestRow key={request.id} request={request} onCancel={setCancelling} />
        ))}
      </Card>

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={t('joinRequest.cancelTitle')}
        message={t('joinRequest.cancelConfirm', { name: cancelling?.player?.name ?? '' })}
        confirmLabel={t('joinRequest.cancel')}
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
