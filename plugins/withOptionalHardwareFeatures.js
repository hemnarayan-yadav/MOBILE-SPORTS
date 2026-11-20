// Two things in this app each make Android's build tools infer a *required*
// hardware feature, though neither is actually required:
//
//   - `orientation: 'portrait'` (app.config.js) implies
//     android.hardware.screen.portrait — a UI choice, not a hardware need.
//   - expo-network's ACCESS_WIFI_STATE permission (used for the online/offline
//     listener in src/lib/appLifecycle.js) implies android.hardware.wifi — the
//     app works fine over mobile data; it never requires a wifi radio.
//
// Left unmarked, Play Console blocks the app from phones, tablets and
// Android XR devices that lack either one. An explicit `required="false"`
// on each <uses-feature> is the fix Android itself expects, and Expo has no
// top-level config key for it, so this is a small plugin instead.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withOptionalHardwareFeatures(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults.manifest['uses-feature'] = [
      { $: { 'android:name': 'android.hardware.screen.portrait', 'android:required': 'false' } },
      { $: { 'android:name': 'android.hardware.wifi', 'android:required': 'false' } },
    ];
    return config;
  });
};
