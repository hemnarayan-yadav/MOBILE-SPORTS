// Ported from frontend/src/lib/analytics.js.
import PostHog from 'posthog-react-native';
import { env } from '../config/env.js';

// The five steps that say whether this product works:
//
//   signed up → made a team → filled the squad → scored a match → shared it
//
// Nothing else is measured, and **nothing personal leaves this file**: session
// replay and autocapture are off, and the only properties sent are the ones
// written here — a role, a district, a count. Never a name, a number, an email
// or anybody else's id.
//
// Without a key (every development build, and every test) all of it is a
// no-op.
export const EVENTS = Object.freeze({
  SIGNED_UP: 'signed_up',
  TEAM_CREATED: 'team_created',
  SQUAD_PLAYER_ADDED: 'squad_player_added',
  MATCH_SCORED: 'match_scored',
  SHARED: 'shared',
});

// PostHog's EU cloud unless an environment names another.
const DEFAULT_HOST = 'https://eu.i.posthog.com';

let client = null;

export function startAnalytics() {
  if (client || !env.POSTHOG_KEY) return;
  try {
    client = new PostHog(env.POSTHOG_KEY, {
      host: env.POSTHOG_HOST ?? DEFAULT_HOST,
      enableSessionReplay: false,
      captureAppLifecycleEvents: false,
    });
  } catch {
    // Analytics may never stop the app from starting.
    client = null;
  }
}

/**
 * Who is doing this, by account id only. The role and the district say which
 * kind of person and which circuit; neither identifies anybody.
 */
export function identify(user) {
  if (!client || !user?.id) return;
  try {
    client.identify(user.id, {
      role: user.role,
      state: user.area?.state ?? null,
      district: user.area?.district ?? null,
    });
  } catch {
    /* ignore */
  }
}

export function resetAnalytics() {
  if (!client) return;
  try {
    client.reset();
  } catch {
    /* ignore */
  }
}

export function track(event, properties = {}) {
  if (!client) return;
  try {
    client.capture(event, properties);
  } catch {
    /* ignore */
  }
}
