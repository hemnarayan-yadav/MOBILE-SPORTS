// Turning the full-time card into a picture, and handing it to the phone.
//
// The capture goes to the app's own cache directory and leaves through the
// system share sheet, so this needs **no storage permission**: nothing is
// written to the gallery, and nothing is added to the Play data-safety form.
// Whoever receives it can save it themselves, which is what sharing a score
// usually means anyway.
//
// Nothing is uploaded. The image never leaves the phone except by the share
// sheet the person taps.
//
// Both modules are native and are loaded on demand, for the reason set out in
// lib/boardNative.js: a build made before they were added must still show a
// working board rather than failing while this module is evaluated.

const CAPTURE = Object.freeze({ format: 'png', quality: 1, result: 'tmpfile' });

/**
 * Captures `ref` and opens the share sheet for it.
 *
 * Returns false rather than throwing when there is nothing to capture, the
 * phone has no way to share, or this build has no capture module: a result
 * card that cannot be sent is a disappointment, not an error worth a red
 * screen over a finished match.
 */
export async function shareResultCard(ref, dialogTitle) {
  if (!ref?.current) return false;
  try {
    const Sharing = await import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return false;
    const { captureRef } = await import('react-native-view-shot');
    const uri = await captureRef(ref, CAPTURE);
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
    return true;
  } catch {
    return false;
  }
}
