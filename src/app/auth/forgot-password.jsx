// Forgot password — adapted from frontend/src/pages/auth/ForgotPassword.jsx.
// Prove the contact with a one-time code (email, or the phone when OTP is
// available), then set the new password in the same step.
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { authApi, EMAIL_OTP_PURPOSES } from '../../api/auth.api.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import PhoneField from '../../components/common/PhoneField.jsx';
import Screen from '../../components/common/Screen.jsx';
import SegmentedControl from '../../components/common/SegmentedControl.jsx';
import TextField from '../../components/common/TextField.jsx';
import { useEmailVerification } from '../../hooks/useEmailVerification.js';
import { useGuestScreen } from '../../hooks/useGuestScreen.js';
import { usePhoneVerification } from '../../hooks/usePhoneVerification.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { emailResetSchema, phoneResetSchema } from '../../utils/validation.js';

const METHODS = Object.freeze({ EMAIL: 'email', PHONE: 'phone' });

function PasswordFields({ control, errors }) {
  const { t } = useTranslation();
  return ['password', 'confirmPassword'].map((name) => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          label={t(name === 'password' ? 'auth.newPassword' : 'auth.confirmPassword')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={errors[name]}
        />
      )}
    />
  ));
}

// Resets with a code for the verified contact: `verify` proves it, `send`
// updates the password with the proof.
function useResetFlow({ verify, send, onReset }) {
  const { t } = useTranslation();
  const reset = useMutation({ mutationFn: send });
  const submit = async ({ contact, password, payload }) => {
    const otpToken = await verify(contact).catch((error) => {
      notify.error(t(apiErrorKey(error)));
      return null;
    });
    if (!otpToken) return;
    reset.mutate(
      { ...payload, otpToken, password },
      { onSuccess: onReset, onError: (error) => notify.error(t(apiErrorKey(error))) },
    );
  };
  return { submit, pending: reset.isPending };
}

function EmailResetForm({ verify, onReset }) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(emailResetSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });
  const flow = useResetFlow({ verify, send: authApi.resetPassword, onReset });
  const onSubmit = ({ email, password }) =>
    flow.submit({ contact: email, password, payload: { email } });

  return (
    <View style={styles.form}>
      <AppText tone="muted">{t('auth.emailResetHint')}</AppText>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label={t('auth.email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.email}
          />
        )}
      />
      <PasswordFields control={control} errors={formState.errors} />
      <Button onPress={handleSubmit(onSubmit)} loading={formState.isSubmitting || flow.pending}>
        {t('auth.emailResetSubmit')}
      </Button>
    </View>
  );
}

// Most players sign up without an email, so their password is reset by
// verifying the phone number instead.
function PhoneResetForm({ verify, onReset }) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(phoneResetSchema),
    defaultValues: { phone: '', password: '', confirmPassword: '' },
  });
  const flow = useResetFlow({ verify, send: authApi.otpResetPassword, onReset });
  const onSubmit = ({ phone, password }) =>
    flow.submit({ contact: phone, password, payload: { phone } });

  return (
    <View style={styles.form}>
      <AppText tone="muted">{t('auth.phoneResetHint')}</AppText>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneField
            label={t('auth.phone')}
            value={field.value}
            onChange={field.onChange}
            error={formState.errors.phone}
          />
        )}
      />
      <PasswordFields control={control} errors={formState.errors} />
      <Button onPress={handleSubmit(onSubmit)} loading={formState.isSubmitting || flow.pending}>
        {t('auth.phoneResetSubmit')}
      </Button>
    </View>
  );
}

export default function ForgotPassword() {
  const { t } = useTranslation();
  const router = useRouter();
  useGuestScreen();
  const phoneVerification = usePhoneVerification();
  const emailVerification = useEmailVerification(EMAIL_OTP_PURPOSES.PASSWORD_RESET);
  // Same default as the website (email first).
  const [method, setMethod] = useState(METHODS.EMAIL);
  const [done, setDone] = useState(false);
  const byPhone = phoneVerification.isAvailable && method === METHODS.PHONE;

  if (done) {
    return (
      <Screen title={t('auth.forgotTitle')}>
        <AppText accessibilityLiveRegion="polite">{t('auth.resetSuccess')}</AppText>
        <Button onPress={() => router.replace('/auth/login')}>{t('auth.backToLogin')}</Button>
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.forgotTitle')}>
      {phoneVerification.isAvailable ? (
        <SegmentedControl
          label={t('auth.resetMethod')}
          value={method}
          onChange={setMethod}
          options={[
            { value: METHODS.EMAIL, label: t('auth.methodEmail') },
            { value: METHODS.PHONE, label: t('auth.methodPhone') },
          ]}
        />
      ) : null}
      {byPhone ? (
        <PhoneResetForm verify={phoneVerification.verify} onReset={() => setDone(true)} />
      ) : (
        <EmailResetForm verify={emailVerification.verify} onReset={() => setDone(true)} />
      )}
      {phoneVerification.dialog}
      {emailVerification.dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: SPACING.lg },
});
