// The scoreboard's native comforts, each one optional.
//
// Rotating the screen, holding the backlight on and handing out a picture are
// all native, which means they only exist in a build that was made after they
// were added. The board itself — the names, the scores, both clocks — is plain
// JavaScript and must never be held hostage by them: a development build made
// before these modules arrived should still show a working board, just without
// the rotation, without the backlight held, and with Share quietly absent.
//
// So each module is loaded on demand inside a `try`, the way
// `hooks/useInAppUpdate.js` already loads its own. Importing them at the top of
// a screen would throw while the module is being evaluated —
// `TurboModuleRegistry.getEnforcing(…) could not be found` — and take the whole
// screen down with it.

/** Keeps the screen lit while the board is open. */
export async function holdScreenOn(tag) {
  try {
    const { activateKeepAwakeAsync } = await import('expo-keep-awake');
    await activateKeepAwakeAsync(tag);
    return true;
  } catch {
    return false;
  }
}

/** Lets the screen sleep again. */
export async function releaseScreen(tag) {
  try {
    const { deactivateKeepAwake } = await import('expo-keep-awake');
    deactivateKeepAwake(tag);
    return true;
  } catch {
    return false;
  }
}

/**
 * Turns the board sideways, and puts the phone back the way the rest of the
 * app expects it. `landscape` false restores the app's portrait lock.
 */
export async function lockOrientation(landscape) {
  try {
    const ScreenOrientation = await import('expo-screen-orientation');
    await ScreenOrientation.lockAsync(
      landscape
        ? ScreenOrientation.OrientationLock.LANDSCAPE
        : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
    return true;
  } catch {
    return false;
  }
}

/** Whether this build can hand a picture to the share sheet at all. */
export async function canShare() {
  try {
    const Sharing = await import('expo-sharing');
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}
