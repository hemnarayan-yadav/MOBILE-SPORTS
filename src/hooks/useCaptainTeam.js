// Ported from frontend/src/pages/dashboard/captain/useCaptainTeam.js.
import { useQuery } from '@tanstack/react-query';
import { qk } from '../api/queryKeys.js';
import { teamsApi } from '../api/teams.api.js';
import { useAuthStore } from '../store/authStore.js';

// The signed-in captain's team, including the active squad.
export function useCaptainTeam() {
  const teamId = useAuthStore((s) => s.user?.teamId);
  const query = useQuery({
    queryKey: qk.teams.detail(teamId),
    queryFn: () => teamsApi.get(teamId),
    enabled: Boolean(teamId),
  });
  return { teamId, ...query };
}
