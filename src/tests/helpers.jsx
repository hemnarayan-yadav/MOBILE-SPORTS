import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client.js';
import { createQueryClient } from '../lib/queryClient.js';
import { useAuthStore } from '../store/authStore.js';
import { useNoticeStore } from '../store/noticeStore.js';

export const REFRESH_KEY = 'khelscore.refreshToken';

// An access token whose `exp` is `secondsFromNow` away (unsigned: the app only
// reads the claim to decide when to renew).
export function accessTokenExpiringIn(secondsFromNow, label = 'a') {
  const payload = Buffer.from(
    JSON.stringify({ sub: label, exp: Math.floor(Date.now() / 1000) + secondsFromNow }),
  ).toString('base64url');
  return `header.${payload}.sig-${label}`;
}

// Answers apiClient requests from `handler(config) → { status, data }` without
// a network, and records every request.
export function fakeApi(handler) {
  const calls = [];
  const original = apiClient.defaults.adapter;
  apiClient.defaults.adapter = async (config) => {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    const call = { method: config.method, url: config.url, body, headers: config.headers };
    calls.push(call);
    const { status = 200, data = {} } = (await handler(call)) ?? {};
    const response = { status, data, headers: {}, config, statusText: String(status) };
    if (status >= 400) {
      const error = new Error(`Request failed with status code ${status}`);
      error.response = response;
      error.config = config;
      throw error;
    }
    return response;
  };
  return {
    calls,
    restore: () => {
      apiClient.defaults.adapter = original;
    },
  };
}

export const ok = (data, status = 200) => ({ status, data: { success: true, data } });
export const fail = (status, code) => ({
  status,
  data: { success: false, error: { code, message: code } },
});

export function resetSession() {
  SecureStore.__store.clear();
  useAuthStore.setState({ user: null, accessToken: null, status: 'unknown' });
  useNoticeStore.setState({ notice: null });
}

export async function renderWithQuery(element) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}
