// Ported from frontend/src/api/otp.api.js (unchanged).
import { apiClient, unwrap } from './client.js';

// Phone verification. `config` says whether OTP is available and which flow the
// app must use; `send` and `verify` drive the code flow (a code the user types
// back), which ends in the `otpToken` the auth and account endpoints accept.
export const otpApi = {
  config: () => apiClient.get('/otp/config').then(unwrap),
  send: (phone) => apiClient.post('/otp/send', { phone }).then(unwrap),
  verify: ({ challengeId, code }) =>
    apiClient.post('/otp/verify', { challengeId, code }).then(unwrap),
};
