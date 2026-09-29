// Adapted from frontend/src/api/users.api.js — the signed-in account's own
// endpoints (the admin user desk stays on the website).
import { apiClient, unwrap } from './client.js';

export const usersApi = {
  getMe: () => apiClient.get('/users/me').then(unwrap),
  updateMe: (changes) => apiClient.patch('/users/me', changes).then(unwrap),
  changePhone: ({ phone, otpToken }) =>
    apiClient.patch('/users/me/phone', { phone, otpToken }).then(unwrap),
  // Confirming the account's own email address: the code goes to the address
  // already on the account, so neither call names it.
  sendEmailCode: () => apiClient.post('/users/me/email/send-code').then(unwrap),
  verifyEmail: (otpToken) => apiClient.post('/users/me/email/verify', { otpToken }).then(unwrap),
  // Deleting your own account. Irreversible, so it carries a fresh proof of
  // ownership — the password, or an OTP proof of the number on the account.
  deleteAccount: (proof) => apiClient.post('/users/me/delete', proof).then(unwrap),
  updatePreferences: (changes) =>
    apiClient.patch('/users/me/notification-preferences', changes).then(unwrap),
};
