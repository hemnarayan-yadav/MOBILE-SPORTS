import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { isForeground } from '../lib/appLifecycle.js';

// Over-the-air updates (EAS Update).
//
// Everything written in JavaScript — screens, scoring rules, translations,
// styles, images — ships without the Play Store: `eas update` publishes it and
// the app picks it up by itself, with nothing for anybody to tap. Only a
// change to the native project (a new native module, a permission, an SDK or
// version bump) still needs a store release, and that is what
// hooks/useInAppUpdate.js is for.
//
// **An update is never applied while the app is running.** It is downloaded in
// the background and the next cold start runs it. Reloading mid-session would
// restart the app under whoever is holding it, and in Live Match Control that
// means losing the console mid-raid — not a trade this product makes
// (CLAUDE.md, product constraint 5). An update can afford to be a few hours
// late; a match cannot be scored twice.
//
// expo-updates already checks once at launch, which is why nothing is checked
// on mount here. This adds the other half: a phone that keeps the app alive
// for days never cold-starts, so it is checked again whenever the app comes
// back to the foreground.
//
// `Updates.isEnabled` is false wherever updates are not configured — every
// development build, and the tests — and the hook then does nothing at all.

// Coming back from the background is common enough to be worth a guard: one
// check an hour is plenty for an update that applies on the next start anyway.
const MIN_CHECK_INTERVAL_MS = 60 * 60_000;

export function useOtaUpdate() {
  const lastCheckedAt = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!Updates.isEnabled) return;
      const now = Date.now();
      if (now - lastCheckedAt.current < MIN_CHECK_INTERVAL_MS) return;
      lastCheckedAt.current = now;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (cancelled || !result.isAvailable) return;
        // Stored for the next cold start; deliberately not reloaded here.
        await Updates.fetchUpdateAsync();
      } catch {
        // Offline, or the update server is unreachable. An update that cannot
        // be fetched is not an error anybody needs to see.
      }
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (isForeground(state)) check();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
