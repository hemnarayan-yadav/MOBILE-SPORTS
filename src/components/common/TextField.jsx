import { forwardRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily } from '../../theme/fonts.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';

// Label, hint and error around a text input, like the web's <FormField>.
// `error` is a react-hook-form error whose message is an i18n key.
export function FieldMessages({ hint, error }) {
  const { t } = useTranslation();
  if (error?.message) {
    return (
      <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
        {t(error.message)}
      </AppText>
    );
  }
  return hint ? (
    <AppText variant="small" tone="muted">
      {hint}
    </AppText>
  ) : null;
}

const TextField = forwardRef(function TextField(
  { label, hint, error, style, inputStyle, ...inputProps },
  ref,
) {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.field, style]}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            fontFamily: fontFamily({ language: i18n.language }),
          },
          inputStyle,
        ]}
        {...inputProps}
      />
      <FieldMessages hint={hint} error={error} />
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
  },
});
