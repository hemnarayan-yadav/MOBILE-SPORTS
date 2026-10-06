// Adapted from frontend/src/api/invitations.api.js. For the invited person: the
// link token goes in the body, never the URL, so it stays out of server request
// logs. `accept` needs a fresh OTP proof of the signed-in account's phone and
// accepts every pending invitation for that number.
import { apiClient, unwrap } from './client.js';

export const invitationsApi = {
  preview: (token) => apiClient.post('/invitations/preview', { token }).then(unwrap),
  accept: (otpToken) => apiClient.post('/invitations/accept', { otpToken }).then(unwrap),
  // Sign-up: the open invitations for a number just proved by OTP. The proof is
  // checked, not spent, so the same one then registers the account.
  lookup: ({ phone, otpToken }) =>
    apiClient.post('/invitations/lookup', { phone, otpToken }).then(unwrap),

  // For the team's captain. Inviting is retired — a captain now adds a player
  // directly (teamsApi.addDirectPlayer) and the API has no create or resend
  // endpoint any more. What is left serves the invitations sent before the
  // change: they can still be listed and cancelled, and still be accepted.
  listForTeam: (teamId) => apiClient.get(`/teams/${teamId}/invitations`).then(unwrap),
  cancel: (teamId, invitationId) =>
    apiClient.delete(`/teams/${teamId}/invitations/${invitationId}`).then(unwrap),
};
