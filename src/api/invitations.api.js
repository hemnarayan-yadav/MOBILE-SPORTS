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

  // For the team's captain. The API sends the link on WhatsApp and never
  // returns a token; responses carry the invitation and its `delivery` state.
  listForTeam: (teamId) => apiClient.get(`/teams/${teamId}/invitations`).then(unwrap),
  create: (teamId, payload) => apiClient.post(`/teams/${teamId}/invitations`, payload).then(unwrap),
  resend: (teamId, invitationId) =>
    apiClient.post(`/teams/${teamId}/invitations/${invitationId}/resend`).then(unwrap),
  cancel: (teamId, invitationId) =>
    apiClient.delete(`/teams/${teamId}/invitations/${invitationId}`).then(unwrap),
};
