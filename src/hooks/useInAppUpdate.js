import { useEffect } from 'react';
import { Platform } from 'react-native';

// Google Play's own update flow, for the releases OTA cannot carry (a new
// native module, a permission, an SDK bump — see hooks/useOtaUpdate.js for
// everything else, which never reaches this hook at all).
//
// Play offers two kinds, and the difference is who finishes the job:
//
//   IMMEDIATE  Play takes over the screen and installs by itself.
//   FLEXIBLE   Play asks in a small dialog and downloads in the background,
//              then waits — the install happens only when the app calls
//              `installUpdate()`. Without that call the download sits there
//              and nothing ever changes, which is indistinguishable from an
//              update the person accepted and the app then ignored.
//
// So the listener below is not a nicety: it is what makes FLEXIBLE finish.
// Play restarts the app as part of the install, so it fires once, after the
// download has completed.
//
// Google has no silent store update to offer: an install always needs the
// person to accept it once. That is why most releases should go out as an OTA
// update instead, and this path is kept for the ones that cannot.
//
// None of it reaches a build that did not come from Play (a sideloaded APK, a
// development client): `checkNeedsUpdate` throws there and the hook stays
// silent.
const IMMEDIATE_AFTER_DAYS = 7;

export function useInAppUpdate() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let updates;
    let onStatus;
    (async () => {
      try {
        const SpInAppUpdates = (await import('sp-react-native-in-app-updates')).default;
        const { IAUUpdateKind, IAUInstallStatus } = await import('sp-react-native-in-app-updates');
        updates = new SpInAppUpdates(false);

        const result = await updates.checkNeedsUpdate();
        if (!result.shouldUpdate) return;

        const staleness = result.other?.staleDays ?? 0;
        const updateType =
          staleness > IMMEDIATE_AFTER_DAYS ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE;

        if (updateType === IAUUpdateKind.FLEXIBLE) {
          onStatus = (status) => {
            if (status?.status === IAUInstallStatus.DOWNLOADED) updates.installUpdate();
          };
          updates.addStatusUpdateListener(onStatus);
        }

        updates.startUpdate({ updateType });
      } catch {
        // Play Store unreachable, sideloaded build, or dev build — silent.
      }
    })();

    return () => {
      if (updates && onStatus) updates.removeStatusUpdateListener(onStatus);
    };
  }, []);
}
