// Ported from frontend/src/pages/dashboard/captain/useTeamJoinRequests.js.
import { useQuery } from '@tanstack/react-query';
import { qk } from '../api/queryKeys.js';
import { teamsApi } from '../api/teams.api.js';

// Requests the squad is still waiting on, plus the ones the player turned
// down: a captain should see that somebody said no rather than wondering why
// the player never appeared. Accepted ones are in the squad, and withdrawn
// ones were the captain's own doing, so neither is listed.
const SHOWN = new Set(['pending', 'expired', 'rejected']);

export const shownRequests = (requests = []) => requests.filter((req) => SHOWN.has(req.status));

// The join requests of a captain's team, newest first.
export function useTeamJoinRequests(teamId, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.joinRequests.team(teamId),
    queryFn: () => teamsApi.joinRequests(teamId),
    enabled: Boolean(teamId) && enabled,
  });
}
