// Adapted from frontend/src/hooks/usePhoneVerification.js — the code flow only
// (plan decision D9). When the API uses a provider's widget flow (MSG91), phone
// verification is reported unavailable, exactly as on the website without its
// widget keys; a native widget adapter can be added later behind this hook.
import { otpApi } from '../api/otp.api.js';
import { OTP_FLOWS } from '../utils/constants.js';
import { formatPhone } from '../utils/countries.js';
import { useCodeDialog } from './useCodeDialog.js';
import { useOtpConfig } from './useOtpConfig.js';

// Provider-neutral phone verification for screens. `verify(phone)` sends a code
// to an E.164 number, opens the code sheet and resolves with the proof
// (`otpToken`) the API checks, or with null when the result no longer matters.
// It rejects with `{ code }` when the code cannot be sent. Screens render
// `dialog`.
export function usePhoneVerification() {
  const { config, isLoading } = useOtpConfig();
  const isAvailable = Boolean(config?.available) && config.flow === OTP_FLOWS.CODE;

  const { ask, dialog } = useCodeDialog({
    sendCode: otpApi.send,
    verifyCode: otpApi.verify,
    format: formatPhone,
    channel: config?.channel,
  });

  return {
    isAvailable,
    isChecking: isLoading,
    channel: config?.channel ?? null,
    verify: ask,
    dialog,
  };
}
