// Adapted from frontend/src/lib/queryClient.js.
import { QueryClient } from '@tanstack/react-query';

const MAX_QUERY_RETRIES = 1;

// Client errors (auth, permissions, validation, not found) won't succeed on a
// retry; only network failures and server errors are retried.
export function shouldRetryQuery(failureCount, error) {
  const retryable = error?.status === 0 || error?.status >= 500;
  return retryable && failureCount < MAX_QUERY_RETRIES;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetryQuery,
        // Unlike the web (where a live page is pushed over its socket), coming
        // back to the app is the moment its data is most likely stale: a
        // stale query refetches when the app returns to the foreground
        // (lib/appLifecycle.js reports that as "focus").
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();
