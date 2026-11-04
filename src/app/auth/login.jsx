// Sign in — OTP-only. The verified mobile number is the credential; no password
// field exists on mobile. A number with no account is sent to the sign-up
// screen with its proof carried over, so no second OTP is sent.
import { zodResolver } from '@hookform/resolvers/zod';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import Logo from '../../components/common/Logo.jsx';
import PhoneField from '../../components/common/PhoneField.jsx';
import Screen from '../../components/common/Screen.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useGuestScreen } from '../../hooks/useGuestScreen.js';
import { usePhoneVerification } from '../../hooks/usePhoneVerification.js';
import { notify } from '../../store/noticeStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import { otpLoginSchema } from '../../utils/validation.js';

// The green pill at the top so the user sees, before anything else, that the
// screen takes a WhatsApp number and that no password is involved. Shown with a
// WhatsApp glyph when the server's OTP channel is WhatsApp; the same pill in
// neutral tone with an SMS glyph otherwise, so the promise matches the channel.
function ChannelBadge({ channel }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const whatsapp = channel === 'whatsapp';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: whatsapp ? '#E8F8EE' : colors.surface2 },
      ]}
      accessible
      accessibilityLabel={t(whatsapp ? 'app.whatsappOtpBadge' : 'app.smsOtpBadge')}
    >
      <Ionicons
        name={whatsapp ? 'logo-whatsapp' : 'chatbubble-ellipses'}
        size={18}
        color={whatsapp ? '#25D366' : colors.brandStrong}
      />
      <AppText weight="semibold" style={{ color: whatsapp ? '#0E7D3A' : colors.text }}>
        {t(whatsapp ? 'app.whatsappOtpBadge' : 'app.smsOtpBadge')}
      </AppText>
    </View>
  );
}

function OtpLoginForm({ verify, channel }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { otpLogin } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(otpLoginSchema), defaultValues: { phone: '' } });

  const onSubmit = async ({ phone }) => {
    const otpToken = await verify(phone).catch((error) => {
      notify.error(apiErrorText(t, error));
      return null;
    });
    if (!otpToken) return;
    otpLogin.mutate(
      { phone, otpToken },
      {
        onError: (error) => {
          // A number with no account hands its proof to sign-up rather than
          // waste it — the same screen continues to profile without a second
          // OTP send.
          if (error?.code === 'PHONE_NOT_REGISTERED') {
            notify.info(t('auth.noAccountSoSignUp'));
            router.push({ pathname: '/auth/register', params: { phone, otpToken } });
            return;
          }
          notify.error(apiErrorText(t, error));
        },
      },
    );
  };

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneField
            label={t('auth.phone')}
            hint={t('auth.otpPhoneHint', { context: channel })}
            channel={channel}
            value={field.value}
            onChange={field.onChange}
            error={errors.phone}
          />
        )}
      />
      <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting || otpLogin.isPending}>
        {t('auth.sendOtp')}
      </Button>
    </View>
  );
}

export default function Login() {
  const { t } = useTranslation();
  useGuestScreen();
  const phoneVerification = usePhoneVerification();

  // When the server has no OTP provider configured, the screen does not pretend
  // there is a fallback — password sign-in has been removed from mobile.
  if (!phoneVerification.isAvailable && !phoneVerification.isChecking) {
    return (
      <Screen title={t('auth.loginTitle')}>
        <View style={styles.brand}>
          <Logo height={44} title={t('nav.brand')} />
        </View>
        <AppText tone="muted">{t('app.otpUnavailableMobile')}</AppText>
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.loginTitle')} subtitle={t('app.whatsappSubtitle')}>
      <View style={styles.brand}>
        <Logo height={44} title={t('nav.brand')} />
      </View>
      <ChannelBadge channel={phoneVerification.channel} />
      <OtpLoginForm verify={phoneVerification.verify} channel={phoneVerification.channel} />
      <View style={styles.footer}>
        <AppText tone="muted">{t('auth.noAccount')}</AppText>
        <Link href="/auth/register">
          <AppText weight="semibold" tone="brandStrong">
            {t('nav.register')}
          </AppText>
        </Link>
      </View>
      {phoneVerification.dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: SPACING.lg },
  brand: { alignItems: 'center', marginBottom: SPACING.lg },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.full,
    marginBottom: SPACING.md,
  },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, justifyContent: 'center' },
});
