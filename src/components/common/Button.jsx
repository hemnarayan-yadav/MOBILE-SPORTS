import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';

// The app's button, after the web's <Button>: primary (saffron), secondary and
// ghost. While `loading` it shows progress and cannot be pressed twice.
function variantStyle(variant, colors) {
  if (variant === 'secondary') return { bg: colors.surface2, fg: 'text', border: colors.border };
  if (variant === 'ghost') return { bg: 'transparent', fg: 'text', border: 'transparent' };
  if (variant === 'danger') return { bg: colors.surface2, fg: 'danger', border: colors.border };
  return { bg: colors.brandBtn, fg: 'onBrand', border: colors.brandBtn };
}

export default function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
}) {
  const { colors } = useTheme();
  const { bg, fg, border } = variantStyle(variant, colors);
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: border, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={colors[fg]} /> : null}
      <AppText weight="semibold" tone={fg}>
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.md,
    borderWidth: 1,
  },
});
