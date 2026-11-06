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
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';
import { FieldFocusContext } from './fieldFocus.js';

// A bottom sheet over the current screen, the app's counterpart of the web's
// <Sheet>. The system back gesture and the scrim close it (`onClose`).
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
              style={styles.close}
            >
              <AppText weight="semibold" tone="muted">
                {t('common.close')}
              </AppText>
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
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
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
  close: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: SPACING.sm },
  // flexShrink lets the ScrollView fit whatever space is left below the
  // header under the panel's maxHeight, so overflow becomes scrollable.
  bodyFlex: { flexShrink: 1 },
  body: { gap: SPACING.md, paddingBottom: SPACING.lg },
});
