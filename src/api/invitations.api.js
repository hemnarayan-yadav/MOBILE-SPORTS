// Adapted from frontend/src/api/invitations.api.js — sign-up's lookup only; the
// captain's invitation desk and the join screen arrive with Phase M5.
import { apiClient, unwrap } from './client.js';

export const invitationsApi = {
  // Sign-up: the open invitations for a number just proved by OTP. The proof is
  // checked, not spent, so the same one then registers the account.
  lookup: ({ phone, otpToken }) =>
    apiClient.post('/invitations/lookup', { phone, otpToken }).then(unwrap),
};
