// Ported from frontend/src/hooks/useEmailVerification.js (unchanged).
import { useCallback } from 'react';
import { authApi } from '../api/auth.api.js';
import { OTP_CHANNELS } from '../utils/constants.js';
import { useCodeDialog } from './useCodeDialog.js';

// Email verification for screens, the mirror image of usePhoneVerification.
// `verify(email)` sends a code for `purpose`, opens the code sheet and resolves
// with the proof (`otpToken`) the API checks, or with null when the sheet was
// closed. KhelScore sends these codes itself.
export function useEmailVerification(purpose) {
  const sendCode = useCallback((email) => authApi.sendEmailCode({ email, purpose }), [purpose]);

  const { ask, dialog } = useCodeDialog({
    sendCode,
    verifyCode: authApi.verifyEmailCode,
    format: (email) => email,
    channel: OTP_CHANNELS.EMAIL,
  });

  return { verify: ask, dialog };
}
