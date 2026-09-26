import { StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily } from '../../theme/fonts.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';

// The search box of the list screens (the web's <SearchInput>).
export default function SearchField({ value, onChange, placeholder }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      accessibilityLabel={placeholder ?? t('app.searchLabel')}
      placeholderTextColor={colors.muted}
      autoCorrect={false}
      returnKeyType="search"
      style={[
        styles.input,
        {
          color: colors.text,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          fontFamily: fontFamily({ language: i18n.language }),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: MIN_TOUCH + 4,
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
  },
});
