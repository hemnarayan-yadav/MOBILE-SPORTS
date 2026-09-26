// Adapted from frontend/src/components/common/PhoneField.jsx. Every phone input
// in the app so far is an OTP number, which is India-only, so the dialling code
// is shown, not picked: +91 and ten digits. The value handed to the form is
// E.164 — exactly what the API stores.
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { DEFAULT_COUNTRY, countryByCode, joinPhone, splitPhone } from '../../utils/countries.js';
import AppText from './AppText.jsx';
import { FieldMessages } from './TextField.jsx';

export default function PhoneField({ label, hint, error, value, onChange }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const country = countryByCode(DEFAULT_COUNTRY);
  const national = splitPhone(value).national;
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}
      >
        <View
          style={[styles.dial, { borderRightColor: colors.border }]}
          accessible
          accessibilityLabel={`${t('auth.countryCode')} ${country.dial}`}
        >
          <AppText weight="semibold">{country.dial}</AppText>
        </View>
        <TextInput
          accessibilityLabel={label}
          value={national}
          onChangeText={(text) => onChange(joinPhone(DEFAULT_COUNTRY, text))}
          keyboardType="number-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={country.nationalDigits}
          placeholder={'0'.repeat(country.nationalDigits)}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
        />
      </View>
      <FieldMessages hint={hint} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  box: { flexDirection: 'row', borderWidth: 1, borderRadius: RADII.md, minHeight: MIN_TOUCH + 4 },
  dial: { justifyContent: 'center', paddingHorizontal: SPACING.md, borderRightWidth: 1 },
  input: { flex: 1, paddingHorizontal: SPACING.md, fontSize: 16, letterSpacing: 1 },
});
