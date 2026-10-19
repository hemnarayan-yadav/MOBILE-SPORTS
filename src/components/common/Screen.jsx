import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';
import { FieldFocusContext, liftFieldAboveKeyboard } from './fieldFocus.js';

// A scrolling form screen with a back action and a title — the frame of the
// sign-in, sign-up, reset and profile screens.
//
// Keyboard handling. `behavior="padding"` is given on both platforms: with no
// behavior React Native's KeyboardAvoidingView renders a plain View and does
// nothing at all, and Android can no longer fall back on the window resizing,
// because `adjustResize` has no effect once the app draws edge to edge (forced
// since Expo SDK 54). Shrinking the frame is only half of it — the scroll
// offset does not change, so a field near the end of a long form stays below
// the fold. `onKeyboardDidShow` and the focus reports above scroll it into
// view: the first covers opening the keyboard, the second moving from field to
// field while it is already up (no keyboard event is sent for that).
export default function Screen({ title, subtitle, children, onBack }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const scrollRef = useRef(null);
  const focusedField = useRef(null);
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  const liftFocusedField = useCallback(() => {
    liftFieldAboveKeyboard(scrollRef.current, focusedField.current);
  }, []);

  const onFieldFocus = useCallback(
    (field) => {
      focusedField.current = field;
      liftFocusedField();
    },
    [liftFocusedField],
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onKeyboardDidShow={liftFocusedField}
        >
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={styles.back}
          >
            <AppText weight="semibold" tone="muted">
              {`‹ ${t('common.back')}`}
            </AppText>
          </Pressable>
          <View style={styles.heading}>
            <AppText variant="title" accessibilityRole="header">
              {title}
            </AppText>
            {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
          </View>
          <FieldFocusContext.Provider value={onFieldFocus}>{children}</FieldFocusContext.Provider>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  back: { minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  heading: { gap: SPACING.xs },
});
