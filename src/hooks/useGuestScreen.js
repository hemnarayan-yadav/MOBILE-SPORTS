import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';

// Sign-in, sign-up and reset are for signed-out visitors, like the web's
// <GuestRoute>: once a session exists (just signed in, or restored), the app
// returns to the home screen, closing the auth screens on the way.
export function useGuestScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED) router.dismissTo('/');
  }, [status, router]);
}
