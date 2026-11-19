import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';
import { FieldFocusContext } from './fieldFocus.js';

// A bottom sheet over the current screen, the app's counterpart of the web's
// <Sheet>. **Three things close it**: the cross, the system back gesture, and
// a tap on the dimmed page above it.
//
// That last one is why the scrim is a `flex: 1` row above the panel rather
// than the absolutely-positioned overlay it used to be. Absolutely filling the
// window put the scrim *underneath* the panel and left it to the platform to
// decide which of two overlapping views a touch belonged to; the panel won,
// often enough that tapping outside did nothing. As a sibling that simply
// takes the space the panel does not, there is no overlap to arbitrate: the
// dimmed area is exactly the area that closes the sheet.
//
// The cross is a glyph rather than the word "Close": it is the one control in
// the header, it reads the same in every language, and a word there competed
// with the title beside it.
//
// The panel is capped at 90% of the screen height and its body scrolls by
// default, so a long form (Add player, Delete account) never pushes its submit
// button off the bottom edge and never leaves fields hidden behind one that
// appears to float over them.
//
// `scroll={false}` turns the wrapper off for sheets whose content already
// manages its own scroll (a FlatList in SelectSheetField, say) — nesting a
// VirtualizedList inside a same-orientation ScrollView is a React Native
// anti-pattern.
const MAX_HEIGHT_RATIO = 0.9;

export default function Sheet({ open, onClose, title, children, scroll = true }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const maxHeight = Math.round(Dimensions.get('window').height * MAX_HEIGHT_RATIO);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      {/* A modal window is not resized for the keyboard on Android (edge-to-edge),
          so both platforms lift the panel above it. */}
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          testID="sheet-scrim"
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.panel, { backgroundColor: colors.surface, maxHeight }]}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <AppText variant="title" accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={8}
              style={styles.close}
            >
              <Ionicons name="close" size={24} color={colors.muted} />
            </Pressable>
          </View>
          {/* A field in here belongs to the sheet, not to the form screen
              underneath: the panel lifts itself, so the screen behind must not
              scroll to a field nobody can see. The body is a scroll view so
              long forms never clip their last fields behind the submit button;
              `scroll={false}` turns the wrapper off when the caller manages
              its own list. */}
          <FieldFocusContext.Provider value={null}>
            {scroll ? (
              <ScrollView
                style={styles.bodyFlex}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.bodyFlex, styles.body]}>{children}</View>
            )}
          </FieldFocusContext.Provider>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  // Everything the panel does not occupy, and nothing it does: see the note at
  // the top of the file.
  scrim: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  panel: {
    borderTopLeftRadius: RADII.xxl,
    borderTopRightRadius: RADII.xxl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: { flex: 1 },
  close: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // flexShrink lets the ScrollView fit whatever space is left below the
  // header under the panel's maxHeight, so overflow becomes scrollable.
  bodyFlex: { flexShrink: 1 },
  body: { gap: SPACING.md, paddingBottom: SPACING.lg },
});
