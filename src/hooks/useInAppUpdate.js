import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useInAppUpdate() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let updates;
    (async () => {
      try {
        const SpInAppUpdates = (await import('sp-react-native-in-app-updates')).default;
        const { IAUUpdateKind } = await import('sp-react-native-in-app-updates');
        updates = new SpInAppUpdates(false);

        const result = await updates.checkNeedsUpdate();
        if (!result.shouldUpdate) return;

        const staleness = result.other?.staleDays ?? 0;
        const updateType =
          staleness > 7 ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE;

        updates.startUpdate({ updateType });
      } catch {
        // Play Store unreachable, sideloaded build, or dev build — silent.
      }
    })();
  }, []);
}
