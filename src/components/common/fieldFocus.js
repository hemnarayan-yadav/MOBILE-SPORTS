import { createContext, useContext } from 'react';
import { MIN_TOUCH, SPACING } from '../../theme/tokens.js';

// A field inside a scrolling form frame reports the input it focuses here, so
// the frame can lift that input clear of the keyboard (components/common/
// Screen.jsx). Outside such a frame — a Sheet, a plain list screen — there is
// no handler and fields behave exactly as they did before.
export const FieldFocusContext = createContext(null);

export const useFieldFocus = () => useContext(FieldFocusContext);

// How much is kept clear below the lifted field, so the next field or the
// submit button under it comes along rather than sitting on the keyboard.
export const FIELD_CLEARANCE = MIN_TOUCH + SPACING.lg;

// Scrolls `field` far enough for the keyboard to stop covering it, using the
// ScrollView's own helper: it measures the input and knows where the keyboard
// is. `true` is `preventNegativeScrollOffset` — it keeps the content from being
// pulled *down* when the field is already clear, so nothing jumps.
export function liftFieldAboveKeyboard(scroll, field) {
  if (!field || typeof scroll?.scrollResponderScrollNativeHandleToKeyboard !== 'function') return;
  scroll.scrollResponderScrollNativeHandleToKeyboard(field, FIELD_CLEARANCE, true);
}
