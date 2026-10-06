// Ported from frontend/src/pages/dashboard/captain/useTeamInvitations.js.
import { useQuery } from '@tanstack/react-query';
import { invitationsApi } from '../api/invitations.api.js';
import { qk } from '../api/queryKeys.js';

// Invitation states the captain can still act on.
const OPEN = new Set(['pending', 'expired']);

export const isOpen = (invitation) => OPEN.has(invitation.status);
export const openInvitations = (invitations = []) => invitations.filter(isOpen);

// The invitations a team still has from before inviting was retired. Nothing is
// ever sent now, so there is no delivery state to watch and nothing to poll for.
export function useTeamInvitations(teamId, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.invitations.team(teamId),
    queryFn: () => invitationsApi.listForTeam(teamId),
    enabled: Boolean(teamId) && enabled,
  });
}
