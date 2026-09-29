// Sign in — adapted from frontend/src/pages/auth/Login.jsx: password (email or
// phone) or a one-time code on the phone. OTP sign-in is offered only when the
// API's code flow is available.
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import PhoneField from '../../components/common/PhoneField.jsx';
import Screen from '../../components/common/Screen.jsx';
import SegmentedControl from '../../components/common/SegmentedControl.jsx';
import TextField from '../../components/common/TextField.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useGuestScreen } from '../../hooks/useGuestScreen.js';
import { usePhoneVerification } from '../../hooks/usePhoneVerification.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { loginSchema, otpLoginSchema } from '../../utils/validation.js';

const METHODS = Object.freeze({ PASSWORD: 'password', OTP: 'otp' });

function PasswordLoginForm({ initialIdentifier = '' }) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: initialIdentifier, password: '' },
  });

  const onSubmit = (values) =>
    login.mutate(values, { onError: (error) => notify.error(t(apiErrorKey(error))) });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="identifier"
        render={({ field }) => (
          <TextField
            label={t('auth.identifier')}
            placeholder={t('auth.identifierPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.identifier}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('auth.password')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={handleSubmit(onSubmit)}
            error={errors.password}
          />
        )}
      />
      <Link href="/auth/forgot-password" style={styles.link}>
        <AppText weight="semibold" tone="brandStrong">
          {t('auth.forgotPasswordLink')}
        </AppText>
      </Link>
      <Button onPress={handleSubmit(onSubmit)} loading={login.isPending}>
        {t('auth.loginSubmit')}
      </Button>
    </View>
  );
}

function OtpLoginForm({ verify, channel }) {
  const { t } = useTranslation();
  const { otpLogin } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(otpLoginSchema), defaultValues: { phone: '' } });

  const onSubmit = async ({ phone }) => {
    const otpToken = await verify(phone).catch((error) => {
      notify.error(t(apiErrorKey(error)));
      return null;
    });
    if (!otpToken) return;
    otpLogin.mutate(
      { phone, otpToken },
      { onError: (error) => notify.error(t(apiErrorKey(error))) },
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
  // A pre-filled phone comes in from the sign-up screen when someone tried to
  // register a number that already has an account (item #1 of the launch
  // sprint). It is only accepted for the password path; the OTP path collects
  // its own number.
  const params = useLocalSearchParams();
  const initialIdentifier = typeof params.phone === 'string' ? params.phone : '';
  const phoneVerification = usePhoneVerification();
  const [method, setMethod] = useState(METHODS.PASSWORD);
  const showOtp = phoneVerification.isAvailable && method === METHODS.OTP;

  return (
    <Screen title={t('auth.loginTitle')}>
      {phoneVerification.isAvailable ? (
        <SegmentedControl
          label={t('auth.loginMethod')}
          value={method}
          onChange={setMethod}
          options={[
            { value: METHODS.PASSWORD, label: t('auth.methodPassword') },
            { value: METHODS.OTP, label: t('auth.methodOtp') },
          ]}
        />
      ) : null}
      {showOtp ? (
        <OtpLoginForm verify={phoneVerification.verify} channel={phoneVerification.channel} />
      ) : (
        <PasswordLoginForm initialIdentifier={initialIdentifier} />
      )}
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
  link: { alignSelf: 'flex-end', paddingVertical: SPACING.sm },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, justifyContent: 'center' },
});
