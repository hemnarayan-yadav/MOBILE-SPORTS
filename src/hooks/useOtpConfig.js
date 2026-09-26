// Ported from frontend/src/hooks/useOtpConfig.js (unchanged).
import { useQuery } from '@tanstack/react-query';
import { otpApi } from '../api/otp.api.js';
import { qk } from '../api/queryKeys.js';

// The provider can be switched on the server, so the answer is refreshed now
// and then rather than cached for the whole visit.
const CONFIG_STALE_MS = 5 * 60_000;

// Whether phone OTP is available and which flow and channel the API uses. The
// provider itself is never named.
export function useOtpConfig() {
  const { data, isPending } = useQuery({
    queryKey: qk.otp.config,
    queryFn: otpApi.config,
    staleTime: CONFIG_STALE_MS,
  });
  return { config: data ?? null, isLoading: isPending };
}
