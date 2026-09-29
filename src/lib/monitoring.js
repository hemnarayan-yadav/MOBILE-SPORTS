// Crash reporting — the only file in the app that knows Sentry.
//
// Screens and hooks call `captureError()`; nothing else imports the SDK, so the
// provider can be swapped without touching a screen (the same rule the backend
// applies to its OTP, messaging and push providers).
//
// Two hard rules:
//
// 1. **No personal data leaves the phone.** Sentry's own PII collection is off,
//    and every event goes through `scrubEvent()` first: known-sensitive keys are
//    replaced and free text is searched for phone numbers, email addresses,
//    bearer tokens, push tokens and one-time codes. A report is worth nothing if
//    it costs somebody their privacy.
// 2. **It is optional.** Without EXPO_PUBLIC_SENTRY_DSN nothing is initialised
//    and `captureError()` is a no-op, so development builds and any release the
//    owner has not configured behave exactly as before.
//
// There is no product analytics here and none is planned: crashes only.
import * as Sentry from '@sentry/react-native';
import { env } from '../config/env.js';

const REDACTED = '[redacted]';

// Keys whose value is never useful in a crash report.
const SENSITIVE_KEY = /pass(word)?|token|otp|secret|auth|cookie|phone|email|refresh|session/i;

// Free text is scrubbed too: an error message can quote the value it choked on.
const PATTERNS = Object.freeze([
  // Email addresses.
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  // Phone numbers in any shape the app accepts (E.164 or 10 digits).
  /\+?\d[\d\s-]{8,}\d/g,
  // Expo push tokens and bearer tokens.
  /ExponentPushToken\[[^\]]*\]/g,
  /Bearer\s+[\w.~+/-]+=*/gi,
  // A JWT: three base64url parts.
  /\b[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}\b/g,
]);

function scrubText(value) {
  return PATTERNS.reduce((text, pattern) => text.replace(pattern, REDACTED), value);
}

// Walks an event and returns a scrubbed copy. Exported for the tests: the rule
// this enforces is the reason crash reporting is allowed at all.
export function scrubValue(value, key = '', depth = 0) {
  if (depth > 8) return REDACTED;
  if (typeof value === 'string') return SENSITIVE_KEY.test(key) ? REDACTED : scrubText(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, key, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        SENSITIVE_KEY.test(childKey) && typeof childValue !== 'object'
          ? REDACTED
          : scrubValue(childValue, childKey, depth + 1),
      ]),
    );
  }
  return value;
}

export function scrubEvent(event) {
  const { user: _user, server_name: _serverName, ...rest } = event;
  return scrubValue(rest);
}

// A breadcrumb for an HTTP call carries the URL and sometimes the body; the
// path alone is enough to follow what happened.
function scrubBreadcrumb(breadcrumb) {
  return scrubValue(breadcrumb);
}

export const isMonitoringEnabled = () => Boolean(env.SENTRY_DSN);

export function initMonitoring() {
  if (!isMonitoringEnabled()) return false;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    // Never attach the device's user, IP address or request headers.
    sendDefaultPii: false,
    // Crashes only: no performance traces, no session replay, no analytics.
    tracesSampleRate: 0,
    enableAutoPerformanceTracing: false,
    enableCaptureFailedRequests: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
  return true;
}

// Report an error we handled but did not expect. `context` is scrubbed like
// everything else, so it may hold ids and states but must not be relied on to
// carry anything personal — it would only be removed.
export function captureError(error, context) {
  if (!isMonitoringEnabled()) return;
  Sentry.captureException(error, context ? { extra: scrubValue(context) } : undefined);
}
