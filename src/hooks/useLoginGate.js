import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';

// Routes the gate leaves alone — the sign-in and sign-up screens are what the
// gate redirects *to*, and the deep-link invitation joiner (/join/[token])
// takes a signed-out visitor through its own flow.
const PUBLIC_PREFIXES = ['/auth', '/join'];

const isPublic = (pathname) =>
  typeof pathname === 'string' && PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

/**
 * The app opens on `/auth/login` when there is no stored session: KhelScore is
 * a signed-in experience from the first tap. The gate waits for the auth
 * bootstrap to resolve (`status !== UNKNOWN`), so a restored session does not
 * flash the login screen on its way through.
 */
export function useLoginGate() {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== AUTH_STATUS.ANONYMOUS) return;
    if (isPublic(pathname)) return;
    router.replace('/auth/login');
  }, [status, pathname, router]);
}
