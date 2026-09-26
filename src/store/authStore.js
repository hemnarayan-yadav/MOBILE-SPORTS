// Adapted from frontend/src/store/authStore.js: the same shape. On the phone the
// session survives restarts through the refresh token in the device keystore
// (lib/secureSession.js); the refresh token itself is never kept here.
import { create } from 'zustand';

export const AUTH_STATUS = Object.freeze({
  UNKNOWN: 'unknown', // session restore not finished yet
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
});

// The access token lives in memory only.
export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  status: AUTH_STATUS.UNKNOWN,
  setSession: ({ user, accessToken }) =>
    set({ user, accessToken, status: AUTH_STATUS.AUTHENTICATED }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null, status: AUTH_STATUS.ANONYMOUS }),
}));
