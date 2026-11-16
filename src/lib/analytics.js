// Ported from frontend/src/lib/analytics.js.
import PostHog from 'posthog-react-native';
import { env } from '../config/env.js';

// The five steps that say whether this product works:
//
//   signed up → made a team → filled the squad → scored a match → shared it
//
// **This file now collects personal data, on purpose** — the owner's decision
// of 16 Nov 2026, while the product is new, matching the web app. Session
// replay and the lifecycle events are on and the replay is **not** masked,
// because the question is "which person hit this, and what was on their
// screen". A recording can therefore show a real name, number or typed code.
// Text inputs are masked by default on React Native and that default is kept:
// it is what covers the password field, and `maskAllTextInputs: false` below
// is the switch if a typed value is ever needed.
//
// See frontend/src/lib/analytics.js for what this costs and when to put the
// masking back.
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
      enableSessionReplay: true,
      captureAppLifecycleEvents: true,
      sessionReplayConfig: {
        // Screens are left visible: seeing the squad or the OTP screen as the
        // person saw it is the whole point.
        maskAllImages: false,
        maskAllSandboxedViews: false,
        // Text inputs stay masked, which is what keeps the password out.
        maskAllTextInputs: true,
      },
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
