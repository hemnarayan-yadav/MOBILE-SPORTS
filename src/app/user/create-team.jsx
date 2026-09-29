// Register a team — adapted from frontend/src/pages/dashboard/user/CreateTeam.jsx.
// Registering makes this account the team's captain: the same account, a new
// role, so the profile is refetched from the server answer rather than guessed.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { qk } from '../../api/queryKeys.js';
import { teamsApi } from '../../api/teams.api.js';
import Screen from '../../components/common/Screen.jsx';
import { LoadingState } from '../../components/common/States.jsx';
import TeamForm from '../../components/team/TeamForm.jsx';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { notify } from '../../store/noticeStore.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { ROLES } from '../../utils/constants.js';

export default function CreateTeam() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const setUser = useAuthStore((s) => s.setUser);

  const create = useMutation({
    mutationFn: teamsApi.create,
    onSuccess: ({ team, user }) => {
      setUser(user);
      queryClient.setQueryData(qk.me, user);
      queryClient.setQueryData(qk.teams.detail(team.id), { ...team, squad: [] });
      queryClient.invalidateQueries({ queryKey: qk.teams.all });
      notify.success(t('team.created', { name: team.name }));
      router.replace('/captain/squad');
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  if (status === AUTH_STATUS.ANONYMOUS) return <Redirect href="/auth/login" />;
  // An account that already has a team (or manages tournaments) has nothing to
  // do here; the API refuses it too.
  if (status === AUTH_STATUS.AUTHENTICATED && role !== ROLES.USER)
    return <Redirect href="/captain" />;

  return (
    <Screen title={t('team.createTitle')} subtitle={t('team.createSubtitle')}>
      {status === AUTH_STATUS.UNKNOWN ? (
        <LoadingState />
      ) : (
        <TeamForm
          onSubmit={(values) => create.mutate(values)}
          submitting={create.isPending}
          submitLabel={t('team.createSubmit')}
        />
      )}
    </Screen>
  );
}
