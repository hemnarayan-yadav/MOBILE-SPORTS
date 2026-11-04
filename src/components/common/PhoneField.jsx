// Adapted from frontend/src/components/common/PhoneField.jsx. Every phone input
// in the app so far is an OTP number, which is India-only, so the dialling code
// is shown, not picked: +91 and ten digits. The value handed to the form is
// E.164 — exactly what the API stores.
//
// Optional `channel` prop paints a small WhatsApp (or SMS) glyph inside the
// box, so a user who doesn't read the hint still sees where the code will land.
// The glyph is decorative; the FieldMessages hint underneath is what the screen
// reader announces.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { DEFAULT_COUNTRY, countryByCode, joinPhone, splitPhone } from '../../utils/countries.js';
import AppText from './AppText.jsx';
import { useFieldFocus } from './fieldFocus.js';
import { FieldMessages } from './TextField.jsx';

// WhatsApp brand green stays fixed in both themes — the recognition cue only
// works in the colour villagers already know it by.
const WHATSAPP_GREEN = '#25D366';

// The whole app runs on WhatsApp OTP, so every phone input shows the WhatsApp
// glyph by default. A caller that knows the OTP provider's channel can pass
// it explicitly (e.g. `channel="sms"` when the server flips to SMS).
export default function PhoneField({ label, hint, error, value, onChange, channel = 'whatsapp' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Reported to the scrolling frame so the keyboard never covers this field.
  const onFieldFocus = useFieldFocus();
  const input = useRef(null);
  const country = countryByCode(DEFAULT_COUNTRY);
  const national = splitPhone(value).national;
  const whatsapp = channel === 'whatsapp';
  const sms = channel === 'sms';
  const showChannelIcon = whatsapp || sms;
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
          ref={input}
          accessibilityLabel={label}
          onFocus={() => onFieldFocus?.(input.current)}
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
        {showChannelIcon ? (
          <View style={styles.channel} importantForAccessibility="no" accessibilityElementsHidden>
            <Ionicons
              name={whatsapp ? 'logo-whatsapp' : 'chatbubble-ellipses'}
              size={20}
              color={whatsapp ? WHATSAPP_GREEN : colors.brandStrong}
            />
          </View>
        ) : null}
      </View>
      <FieldMessages hint={hint} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADII.md,
    minHeight: MIN_TOUCH + 4,
  },
  dial: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRightWidth: 1,
    alignSelf: 'stretch',
  },
  input: { flex: 1, paddingHorizontal: SPACING.md, fontSize: 16, letterSpacing: 1 },
  channel: { paddingHorizontal: SPACING.md, justifyContent: 'center' },
});
