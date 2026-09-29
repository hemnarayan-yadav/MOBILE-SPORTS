// Adapted from frontend/src/api/auth.api.js. Session answers carry the refresh
// token in the body (the native transport); api/client.js `startSession` stores
// it, and sign-out lives there too (`signOut`). Admin invite registration stays
// on the website (plan decision D19).
import { apiClient, unwrap } from './client.js';

// What an email verification code may be asked for from the app.
export const EMAIL_OTP_PURPOSES = Object.freeze({ PASSWORD_RESET: 'password_reset' });

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload).then(unwrap),
  // Sign-up availability lookup. Called before the OTP is sent so a number
  // that already has an account never spends a code; the server answers only
  // whether registration may proceed and never who owns the number.
  checkPhone: (phone) => apiClient.post('/auth/check-phone', { phone }).then(unwrap),
  login: (credentials) => apiClient.post('/auth/login', credentials).then(unwrap),
  otpLogin: ({ phone, otpToken }) =>
    apiClient.post('/auth/otp/login', { phone, otpToken }).then(unwrap),
  otpResetPassword: ({ phone, otpToken, password }) =>
    apiClient.post('/auth/otp/reset-password', { phone, otpToken, password }).then(unwrap),
  // Email codes. Sending answers the same way whether or not the address can be
  // used, so nothing here can be used to discover who has an account.
  sendEmailCode: ({ email, purpose }) =>
    apiClient.post('/auth/email-otp/send', { email, purpose }).then(unwrap),
  verifyEmailCode: ({ challengeId, code }) =>
    apiClient.post('/auth/email-otp/verify', { challengeId, code }).then(unwrap),
  resetPassword: ({ email, otpToken, password }) =>
    apiClient.post('/auth/reset-password', { email, otpToken, password }).then(unwrap),
};
