// Adapted from frontend/src/hooks/useAuth.js.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api.js';
import { signOut, startSession } from '../api/client.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';

export function useAuth() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  const login = useMutation({ mutationFn: authApi.login, onSuccess: startSession });
  const otpLogin = useMutation({ mutationFn: authApi.otpLogin, onSuccess: startSession });

  // The local session ends even if the server call fails (e.g. offline), and
  // nothing the account loaded stays cached.
  const logout = useMutation({ mutationFn: signOut, onSettled: () => queryClient.clear() });

  return {
    user,
    status,
    isAuthenticated: status === AUTH_STATUS.AUTHENTICATED,
    login,
    otpLogin,
    logout,
  };
}
