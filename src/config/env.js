import { z } from 'zod';

// Centralized, validated read of the EXPO_PUBLIC_* variables. Consumers import
// `env` and never touch process.env. Every value here is compiled into the app
// bundle and is public — secrets never belong here.
//
// Each variable must be read with a literal `process.env.EXPO_PUBLIC_…`
// expression: that is the form Expo's Babel preset inlines at build time.
function readRawEnv() {
  return {
    APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    API_URL: process.env.EXPO_PUBLIC_API_URL,
    SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL,
    SITE_URL: process.env.EXPO_PUBLIC_SITE_URL,
    DEFAULT_LOCALE: process.env.EXPO_PUBLIC_DEFAULT_LOCALE,
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  };
}

export const APP_ENVS = Object.freeze(['development', 'staging', 'production']);

const urlSchema = (name) =>
  z.string({ required_error: `${name} is required` }).url(`${name} must be a URL`);

const envSchema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    API_URL: urlSchema('EXPO_PUBLIC_API_URL'),
    SOCKET_URL: urlSchema('EXPO_PUBLIC_SOCKET_URL'),
    SITE_URL: urlSchema('EXPO_PUBLIC_SITE_URL'),
    DEFAULT_LOCALE: z.enum(['en', 'hi']).default('en'),
    // Optional. A Sentry DSN is an ingest URL, not a secret (it can only write
    // events), but it is still per-environment. Unset: no crash reporting.
    SENTRY_DSN: urlSchema('EXPO_PUBLIC_SENTRY_DSN').optional(),
  })
  .superRefine((cfg, ctx) => {
    // Only a development build may talk to a plain-http backend (a laptop on
    // the local network). Anything installed by testers or users is https.
    if (cfg.APP_ENV === 'development') return;
    for (const key of ['API_URL', 'SOCKET_URL', 'SITE_URL']) {
      if (!cfg[key].startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must use https outside development`,
        });
      }
    }
  });

// Empty strings count as unset, like the backend's configuration.
const blankToUndefined = (raw) =>
  Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value?.trim() || undefined]));

export function loadEnv(raw) {
  const result = envSchema.safeParse(blankToUndefined(raw));
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid app configuration (EXPO_PUBLIC_*):\n${details}`);
  }
  return Object.freeze(result.data);
}

export const env = loadEnv(readRawEnv());
