import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';

// A bottom sheet over the current screen, the app's counterpart of the web's
// <Sheet>. The system back gesture and the scrim close it (`onClose`).
export default function Sheet({ open, onClose, title, children }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      {/* A modal window is not resized for the keyboard on Android (edge-to-edge),
          so both platforms lift the panel above it. */}
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <SafeAreaView
          edges={['bottom']}
          style={[styles.panel, { backgroundColor: colors.surface }]}
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
          {children}
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
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: { flex: 1 },
  close: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: SPACING.sm },
});
