// Edit the team — adapted from TeamEditor in
// frontend/src/pages/dashboard/captain/CaptainPages.jsx: the same form, plus
// activating or deactivating the team. A Super Admin deactivation cannot be
// undone here (the API refuses it too, with TEAM_STATUS_LOCKED).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { qk } from '../../api/queryKeys.js';
import { teamsApi } from '../../api/teams.api.js';
import AppText from '../../components/common/AppText.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { Card } from '../../components/common/Layout.jsx';
import CaptainScreen, { LockedNotice } from '../../components/team/CaptainScreen.jsx';
import TeamForm, { toTeamFormValues } from '../../components/team/TeamForm.jsx';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { ROLES, TEAM_STATUS } from '../../utils/constants.js';

function Editor({ team }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const apply = (updated) => queryClient.setQueryData(qk.teams.detail(updated.id), updated);
  const update = useMutation({
    mutationFn: (values) => teamsApi.update(team.id, values),
    onSuccess: (updated) => {
      apply(updated);
      queryClient.invalidateQueries({ queryKey: qk.teams.all });
      notify.success(t('team.saved'));
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });
  const setStatus = useMutation({
    mutationFn: (next) => teamsApi.setStatus(team.id, next),
    onSuccess: (updated) => {
      apply(updated);
      setConfirming(false);
      notify.success(
        t(updated.status === TEAM_STATUS.ACTIVE ? 'team.activated' : 'team.deactivated'),
      );
    },
    onError: (error) => {
      setConfirming(false);
      notify.error(t(apiErrorKey(error)));
    },
  });

  const next = team.status === TEAM_STATUS.ACTIVE ? TEAM_STATUS.INACTIVE : TEAM_STATUS.ACTIVE;
  const deactivating = next === TEAM_STATUS.INACTIVE;
  const locked = team.deactivatedByRole === ROLES.SUPER_ADMIN;

  return (
    <View style={styles.stack}>
      <LockedNotice team={team} />
      <TeamForm
        defaultValues={toTeamFormValues(team)}
        onSubmit={(values) => update.mutate(values)}
        submitting={update.isPending}
        submitLabel={t('common.saveChanges')}
      />
      <Card>
        <AppText weight="bold" accessibilityRole="header">
          {t('team.statusTitle')}
        </AppText>
        <AppText variant="small" tone="muted">
          {t(deactivating ? 'team.deactivateHint' : 'team.activateHint')}
        </AppText>
        <StatusBadge status={team.status} />
        <Button
          variant={deactivating ? 'danger' : 'primary'}
          disabled={locked && !deactivating}
          onPress={() => setConfirming(true)}
        >
          {t(deactivating ? 'team.deactivate' : 'team.activate')}
        </Button>
      </Card>

      <ConfirmDialog
        open={confirming}
        tone={deactivating ? 'danger' : 'primary'}
        title={t(deactivating ? 'team.deactivate' : 'team.activate')}
        message={t(deactivating ? 'team.deactivateConfirm' : 'team.activateConfirm', {
          name: team.name,
        })}
        loading={setStatus.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => setStatus.mutate(next)}
      />
    </View>
  );
}

export default function TeamEditor() {
  const { t } = useTranslation();
  return (
    <CaptainScreen title={t('captain.editTeam')}>{(team) => <Editor team={team} />}</CaptainScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.md },
});
