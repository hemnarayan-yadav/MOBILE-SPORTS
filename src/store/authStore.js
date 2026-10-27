// Adapted from frontend/src/store/authStore.js: the same shape. On the phone the
// session survives restarts through the refresh token in the device keystore
// (lib/secureSession.js); the refresh token itself is never kept here.
import { create } from 'zustand';
import { identify, resetAnalytics } from '../lib/analytics.js';

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
  setSession: ({ user, accessToken }) => {
    // By account id, role and district only — never a name or a number
    // (lib/analytics.js).
    identify(user);
    set({ user, accessToken, status: AUTH_STATUS.AUTHENTICATED });
  },
  setUser: (user) => set({ user }),
  clear: () => {
    // Signing out ends the trail: what the next person on this phone does is
    // not the last one's.
    resetAnalytics();
    set({ user: null, accessToken: null, status: AUTH_STATUS.ANONYMOUS });
  },
}));
