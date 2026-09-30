// Create an account — adapted from frontend/src/pages/auth/Register.jsx. Two
// steps: prove the number (the account's identity), then the details. The
// invitations waiting for the proved number are read from the server and the
// captain's name for the player is suggested.
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { authApi } from '../../api/auth.api.js';
import { startSession } from '../../api/client.js';
import { invitationsApi } from '../../api/invitations.api.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import PhoneField from '../../components/common/PhoneField.jsx';
import Screen from '../../components/common/Screen.jsx';
import StateDistrictFields from '../../components/common/StateDistrictFields.jsx';
import TextField from '../../components/common/TextField.jsx';
import { useGuestScreen } from '../../hooks/useGuestScreen.js';
import { usePhoneVerification } from '../../hooks/usePhoneVerification.js';
import { notify } from '../../store/noticeStore.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { formatPhone } from '../../utils/countries.js';
import {
  registerPhoneSchema,
  registerProfileSchema,
  toLocationPayload,
} from '../../utils/validation.js';

const STEPS = Object.freeze({ PHONE: 'phone', PROFILE: 'profile' });

// Step one: the number and its one-time code. Coming back to it from step two
// keeps the proof: the same number continues without a new code. The number
// is first checked against the API — if it already has an account, the OTP is
// never sent (a real bug the owner reported on 2026-09-29: sending the OTP,
// taking name and password and only then failing at register with PHONE_TAKEN).
function PhoneStep({ verification, verified, onVerified, onContinue }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [takenPhone, setTakenPhone] = useState(null);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerPhoneSchema),
    defaultValues: { phone: verified?.phone ?? '' },
  });
  const currentPhone = watch('phone');
  const stillVerified = Boolean(verified) && currentPhone === verified.phone;
  // The notice only stands as long as the number in the field is the one it
  // was raised for; edit the number and it goes away.
  const showTakenNotice = takenPhone && takenPhone === currentPhone;

  const onSubmit = async ({ phone }) => {
    if (stillVerified) return onContinue();
    // Ask the API whether the number is free before spending an OTP send.
    // Any transport failure falls through to the OTP path — the server-side
    // check on /auth/register still refuses a taken number, so this is a UX
    // improvement, not the sole gate.
    try {
      const result = await authApi.checkPhone(phone);
      if (result && result.available === false) {
        setTakenPhone(phone);
        return;
      }
    } catch (error) {
      // Availability could not be checked — fall through to the OTP path;
      // /auth/register remains the authority and will refuse if truly taken.
      if (error?.code) {
        notify.error(t(apiErrorKey(error)));
        return;
      }
    }
    setTakenPhone(null);
    const otpToken = await verification.verify(phone).catch((error) => {
      notify.error(t(apiErrorKey(error)));
      return null;
    });
    if (otpToken) await onVerified({ phone, otpToken });
  };

  return (
    <View style={styles.form}>
      {!verification.isAvailable && !verification.isChecking ? (
        <AppText tone="muted" accessibilityLiveRegion="polite">
          {t('auth.otpUnavailableRegister')}
        </AppText>
      ) : null}
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneField
            label={t('auth.phone')}
            hint={t('auth.registerOtpHint', { context: verification.channel })}
            value={field.value}
            onChange={(value) => {
              if (takenPhone) setTakenPhone(null);
              field.onChange(value);
            }}
            error={errors.phone}
          />
        )}
      />
      {stillVerified ? (
        <AppText weight="semibold" tone="success">
          {t('auth.phoneVerified', { phone: formatPhone(verified.phone) })}
        </AppText>
      ) : null}
      {showTakenNotice ? (
        <PhoneTakenNotice
          phone={takenPhone}
          onSignIn={() =>
            router.replace({ pathname: '/auth/login', params: { phone: takenPhone } })
          }
        />
      ) : null}
      <Button
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        disabled={!stillVerified && !verification.isAvailable}
      >
        {t(stillVerified ? 'auth.continue' : 'auth.sendOtp')}
      </Button>
    </View>
  );
}

// The "already has an account" notice with a one-tap sign-in that carries the
// number over. Kept a component so its colours pick up the current theme.
function PhoneTakenNotice({ phone, onSignIn }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: colors.surface2 }]}>
      <AppText weight="semibold" accessibilityLiveRegion="polite">
        {t('app.phoneAlreadyRegistered')}
      </AppText>
      <AppText tone="muted">{formatPhone(phone)}</AppText>
      <Pressable onPress={onSignIn} accessibilityRole="button" style={styles.inlineAction}>
        <AppText weight="semibold" tone="brandStrong">
          {t('app.signInInstead')}
        </AppText>
      </Pressable>
    </View>
  );
}

// The captain's squad details for each team waiting for this number.
function InvitationSummary({ invitations }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: colors.brandSoft }]}>
      {invitations.map(({ team, jerseyNumber }) => (
        <AppText key={team.id} weight="semibold" tone="brandStrong">
          {jerseyNumber === null
            ? t('auth.joiningTeam', { team: team.name })
            : t('auth.joiningTeamJersey', { team: team.name, jersey: jerseyNumber })}
        </AppText>
      ))}
    </View>
  );
}

// Step two: the rest of the account, created with the proof from step one.
function ProfileStep({ verified, onChangeNumber }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const invitedName = verified.invitations[0]?.playerName ?? '';
  const registerAccount = useMutation({
    mutationFn: authApi.register,
    onSuccess: async ({ joinedTeams, ...session }) => {
      await startSession(session);
      // The team the server says the account joined (newest invitation first).
      // Team pages arrive with Phase M2; until then the app says so here.
      const team = joinedTeams?.[0];
      notify.success(team ? t('app.joinedTeam', { team: team.name }) : t('auth.registerSuccess'));
    },
  });
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerProfileSchema),
    defaultValues: {
      name: invitedName,
      email: '',
      password: '',
      confirmPassword: '',
      state: '',
      district: '',
    },
  });

  // The two pickers are driven together: picking a state clears the district.
  const setLocation = ({ state, district }) => {
    setValue('state', state);
    setValue('district', district);
  };

  const onSubmit = ({ confirmPassword: _confirmPassword, state, district, ...profile }) => {
    registerAccount.mutate(
      {
        ...profile,
        phone: verified.phone,
        otpToken: verified.otpToken,
        location: toLocationPayload({ state, district }),
      },
      {
        onError: (error) => {
          notify.error(t(apiErrorKey(error)));
          // A number taken meanwhile sends them back to step one.
          if (error?.code === 'PHONE_TAKEN') onChangeNumber();
        },
      },
    );
  };

  const field = (name, props) => (
    <Controller
      control={control}
      name={name}
      render={({ field: input }) => (
        <TextField
          value={input.value}
          onChangeText={input.onChange}
          onBlur={input.onBlur}
          error={errors[name]}
          {...props}
        />
      )}
    />
  );

  return (
    <View style={styles.form}>
      <View style={[styles.banner, styles.verifiedRow, { backgroundColor: colors.surface2 }]}>
        <AppText weight="semibold" tone="success" style={styles.flex}>
          {t('auth.phoneVerified', { phone: formatPhone(verified.phone) })}
        </AppText>
        <Pressable onPress={onChangeNumber} accessibilityRole="button" style={styles.inlineAction}>
          <AppText weight="semibold" tone="brandStrong">
            {t('auth.useAnotherPhone')}
          </AppText>
        </Pressable>
      </View>
      {verified.invitations.length > 0 ? (
        <InvitationSummary invitations={verified.invitations} />
      ) : null}
      {field('name', {
        label: t('auth.name'),
        hint: invitedName ? t('auth.invitedNameHint') : undefined,
        autoComplete: 'name',
        textContentType: 'name',
      })}
      {field('email', {
        label: t('auth.emailOptional'),
        hint: t('auth.emailOptionalHint'),
        keyboardType: 'email-address',
        autoCapitalize: 'none',
        autoComplete: 'email',
      })}
      {/* Optional: the account is created whether or not these are filled in.
          They are what the player and team location filters read. */}
      <StateDistrictFields
        state={watch('state')}
        district={watch('district')}
        onChange={setLocation}
        errors={{ state: errors.state, district: errors.district }}
      />
      {field('password', {
        label: t('auth.password'),
        secureTextEntry: true,
        autoCapitalize: 'none',
        autoComplete: 'new-password',
        textContentType: 'newPassword',
      })}
      {field('confirmPassword', {
        label: t('auth.confirmPassword'),
        secureTextEntry: true,
        autoCapitalize: 'none',
        autoComplete: 'new-password',
        textContentType: 'newPassword',
      })}
      <Button onPress={handleSubmit(onSubmit)} loading={registerAccount.isPending}>
        {t('auth.registerSubmit')}
      </Button>
    </View>
  );
}

// The open invitations for a number just proved by OTP, from the server. A
// failed lookup only means nothing is filled in; signing up still accepts them.
function lookupInvitations(phone, otpToken) {
  return invitationsApi
    .lookup({ phone, otpToken })
    .then((data) => data.invitations)
    .catch(() => []);
}

export default function Register() {
  const { t } = useTranslation();
  useGuestScreen();
  const verification = usePhoneVerification();
  const [step, setStep] = useState(STEPS.PHONE);
  // The proved number, its single-use proof and the invitations waiting for it.
  const [verified, setVerified] = useState(null);

  const handleVerified = async ({ phone, otpToken }) => {
    setVerified({ phone, otpToken, invitations: await lookupInvitations(phone, otpToken) });
    setStep(STEPS.PROFILE);
  };
  const changeNumber = () => {
    setVerified(null);
    setStep(STEPS.PHONE);
  };

  return (
    <Screen
      title={t('auth.registerTitle')}
      subtitle={t(step === STEPS.PROFILE ? 'auth.registerStep2' : 'auth.registerStep1')}
      // Step two steps back to step one, keeping the proof and what was typed.
      onBack={step === STEPS.PROFILE ? () => setStep(STEPS.PHONE) : undefined}
    >
      {step === STEPS.PHONE ? (
        <PhoneStep
          verification={verification}
          verified={verified}
          onVerified={handleVerified}
          onContinue={() => setStep(STEPS.PROFILE)}
        />
      ) : null}
      {/* Kept mounted while step one is shown again, so nothing typed is lost;
          a new proof (another number) starts a fresh form. */}
      {verified ? (
        <View style={step !== STEPS.PROFILE && styles.hidden}>
          <ProfileStep key={verified.otpToken} verified={verified} onChangeNumber={changeNumber} />
        </View>
      ) : null}
      <View style={styles.footer}>
        <AppText tone="muted">{t('auth.haveAccount')}</AppText>
        <Link href="/auth/login">
          <AppText weight="semibold" tone="brandStrong">
            {t('nav.login')}
          </AppText>
        </Link>
      </View>
      {verification.dialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: SPACING.lg },
  banner: { borderRadius: RADII.md, padding: SPACING.md, gap: SPACING.xs },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  flex: { flex: 1 },
  inlineAction: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: SPACING.sm },
  hidden: { display: 'none' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, justifyContent: 'center' },
});
