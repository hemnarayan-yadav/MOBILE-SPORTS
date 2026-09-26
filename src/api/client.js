// Adapted from frontend/src/api/client.js. Read-only for now: signing in, the
// access token and the session refresh arrive with Phase M1, together with the
// backend's native refresh-token transport.
import axios from 'axios';
import { env } from '../config/env.js';

const REQUEST_TIMEOUT_MS = 15_000;

// Central Axios instance. All module API files import this — do not create
// ad-hoc axios instances elsewhere.
export const apiClient = axios.create({
  baseURL: env.API_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

export const unwrap = (response) => response.data.data;

// Every downstream consumer sees the same error shape as on the web:
// `{ status, code, message, details }`, where `code` is the API's stable error
// code (or NETWORK_ERROR / HTTP_ERROR when the API gave none).
export function normalizeError(error) {
  const status = error.response?.status;
  const payload = error.response?.data;
  return {
    status: status ?? 0,
    code: payload?.error?.code ?? (status ? 'HTTP_ERROR' : 'NETWORK_ERROR'),
    message: payload?.error?.message ?? error.message ?? 'Request failed',
    details: payload?.error?.details,
  };
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeError(error)),
);
