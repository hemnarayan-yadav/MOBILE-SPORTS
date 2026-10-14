import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
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

const REVEAL_WIDTH = MIN_TOUCH;

const TextField = forwardRef(function TextField(
  { label, hint, error, style, inputStyle, secureTextEntry, ...inputProps },
  ref,
) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  // A password field can be shown: typed blind on a phone keyboard, a password
  // is mistyped often enough that hiding it costs more than it protects. Local
  // state, so it starts hidden again every time the screen is opened.
  const [revealed, setRevealed] = useState(false);
  const secret = Boolean(secureTextEntry);

  return (
    <View style={[styles.field, style]}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          secureTextEntry={secret && !revealed}
          style={[
            styles.input,
            secret && styles.inputWithReveal,
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
        {secret ? (
          <Pressable
            onPress={() => setRevealed((shown) => !shown)}
            style={styles.reveal}
            accessibilityRole="button"
            accessibilityLabel={t(revealed ? 'app.hidePassword' : 'app.showPassword')}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      <FieldMessages hint={hint} error={error} />
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  row: { justifyContent: 'center' },
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
  },
  // Room for the button, so a long password never runs under it.
  inputWithReveal: { paddingRight: REVEAL_WIDTH },
  reveal: {
    position: 'absolute',
    right: 0,
    width: REVEAL_WIDTH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
