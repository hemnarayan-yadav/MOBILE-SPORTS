// Ported from frontend/src/pages/dashboard/captain/useTeamInvitations.js.
import { useQuery } from '@tanstack/react-query';
import { invitationsApi } from '../api/invitations.api.js';
import { qk } from '../api/queryKeys.js';

// Invitation states the captain can still act on.
const OPEN = new Set(['pending', 'expired']);
// Delivery states while the WhatsApp message is still on its way.
export const IN_FLIGHT = new Set(['pending', 'sending']);
// The WhatsApp job runs every minute; check back while a message is on its way.
const DELIVERY_POLL_MS = 15_000;

export const isOpen = (invitation) => OPEN.has(invitation.status);
export const isInFlight = (invitation) =>
  isOpen(invitation) && IN_FLIGHT.has(invitation.delivery?.status);
export const openInvitations = (invitations = []) => invitations.filter(isOpen);

// The captain's team invitations. Polls while a message is being sent.
export function useTeamInvitations(teamId, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.invitations.team(teamId),
    queryFn: () => invitationsApi.listForTeam(teamId),
    enabled: Boolean(teamId) && enabled,
    refetchInterval: (query) => (query.state.data?.some(isInFlight) ? DELIVERY_POLL_MS : false),
  });
}
