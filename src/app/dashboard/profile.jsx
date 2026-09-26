// My profile — adapted from frontend/src/pages/dashboard/Profile.jsx: details
// and photo, the email (confirmed by code), the phone (changed only through
// OTP), notification preferences, language and theme, and signing out.
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';
import { authApi } from '../../api/auth.api.js';
import { qk } from '../../api/queryKeys.js';
import { usersApi } from '../../api/users.api.js';
import AppText from '../../components/common/AppText.jsx';
import AvatarField from '../../components/common/AvatarField.jsx';
import Button from '../../components/common/Button.jsx';
import { LanguageSwitcher, ThemeToggle } from '../../components/common/Controls.jsx';
import PhoneField from '../../components/common/PhoneField.jsx';
import Screen from '../../components/common/Screen.jsx';
import Sheet from '../../components/common/Sheet.jsx';
import { ErrorState, LoadingState } from '../../components/common/States.jsx';
import TextField from '../../components/common/TextField.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useCodeDialog } from '../../hooks/useCodeDialog.js';
import { usePhoneVerification } from '../../hooks/usePhoneVerification.js';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { notify } from '../../store/noticeStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { MANAGER_ROLES, OTP_CHANNELS } from '../../utils/constants.js';
import { formatPhone, splitPhone } from '../../utils/countries.js';
import { changePhoneSchema, profileSchemaFor } from '../../utils/validation.js';

const PREFERENCES = ['matchUpdates', 'results', 'reminders', 'registrations', 'email'];

function toFormValues(profile) {
  return {
    name: profile.name,
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    avatarUrl: profile.avatarUrl ?? '',
  };
}

// Keeps the auth store and the cached profile in step after any account edit.
function useApplyProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return (updated) => {
    setUser(updated);
    queryClient.setQueryData(qk.me, updated);
  };
}

// The phone stays in the form values only for the role-based contact rules; it
// is never sent from here — a number is saved through PhoneSection alone.
function withoutPhone({ phone: _phone, ...values }) {
  return values;
}

function Section({ title, children }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText weight="bold" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Status({ ok, yes, no }) {
  return (
    <AppText variant="small" weight="semibold" tone={ok ? 'success' : 'warning'}>
      {ok ? yes : no}
    </AppText>
  );
}

function ProfileForm({ profile }) {
  const { t } = useTranslation();
  const applyProfile = useApplyProfile();
  const update = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: (updated) => {
      applyProfile(updated);
      notify.success(t('profile.saved'));
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(
      profileSchemaFor(profile.role, {
        hasPhone: Boolean(profile.phone),
        hasEmail: Boolean(profile.email),
      }),
    ),
    defaultValues: toFormValues(profile),
  });

  return (
    <View style={styles.stack}>
      <Controller
        control={control}
        name="avatarUrl"
        render={({ field }) => (
          <AvatarField
            label={t('profile.avatarUrl')}
            name={watch('name')}
            value={field.value}
            onChange={(url) => field.onChange(url)}
            error={errors.avatarUrl}
          />
        )}
      />
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label={t('auth.name')}
            autoComplete="name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name}
          />
        )}
      />
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
            // "Keep an email or a phone" is reported on the phone, which has
            // no input here, so it is shown with the email.
            error={errors.email ?? errors.phone}
          />
        )}
      />
      <Button
        onPress={handleSubmit((values) => update.mutate(withoutPhone(values)))}
        disabled={!isDirty}
        loading={update.isPending}
      >
        {t('profile.save')}
      </Button>
    </View>
  );
}

// Confirming the address already on the account: the code goes there, so
// nothing is typed twice.
function EmailSection({ profile }) {
  const { t } = useTranslation();
  const applyProfile = useApplyProfile();
  const { ask, dialog } = useCodeDialog({
    sendCode: usersApi.sendEmailCode,
    verifyCode: authApi.verifyEmailCode,
    format: () => profile.email,
    channel: OTP_CHANNELS.EMAIL,
  });
  const confirm = useMutation({
    mutationFn: usersApi.verifyEmail,
    onSuccess: (updated) => {
      applyProfile(updated);
      notify.success(t('profile.emailConfirmed'));
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  const start = async () => {
    const otpToken = await ask(profile.email).catch((error) => {
      notify.error(t(apiErrorKey(error)));
      return null;
    });
    if (otpToken) confirm.mutate(otpToken);
  };

  return (
    <View style={styles.stack}>
      <AppText variant="label">{t('auth.email')}</AppText>
      <AppText>{profile.email ?? t('profile.noEmail')}</AppText>
      {profile.email ? (
        <Status
          ok={profile.emailVerified}
          yes={t('profile.emailVerified')}
          no={t('profile.emailNotVerified')}
        />
      ) : null}
      {profile.email && !profile.emailVerified ? (
        <Button variant="secondary" onPress={start} loading={confirm.isPending}>
          {t('profile.confirmEmail')}
        </Button>
      ) : null}
      {dialog}
    </View>
  );
}

function ChangePhoneForm({ profile, verify, onSaved }) {
  const { t } = useTranslation();
  const save = useMutation({
    mutationFn: usersApi.changePhone,
    onSuccess: onSaved,
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });
  // Prefilled only with an Indian number: OTP cannot verify any other.
  const current = profile.phone && splitPhone(profile.phone).code === 'IN' ? profile.phone : '';
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(changePhoneSchema), defaultValues: { phone: current } });

  const onSubmit = async ({ phone }) => {
    const otpToken = await verify(phone).catch((error) => {
      notify.error(t(apiErrorKey(error)));
      return null;
    });
    if (otpToken) save.mutate({ phone, otpToken });
  };

  return (
    <View style={styles.stack}>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneField
            label={t('auth.phone')}
            hint={t('profile.changePhoneHint')}
            value={field.value}
            onChange={field.onChange}
            error={errors.phone}
          />
        )}
      />
      <Button onPress={handleSubmit(onSubmit)} loading={isSubmitting || save.isPending}>
        {t('profile.verifyAndSave')}
      </Button>
    </View>
  );
}

// Adding, changing or confirming the number always goes through OTP, and the
// number is saved only once verified. Managers, who are reached by email, may
// also remove it.
function PhoneSection({ profile }) {
  const { t } = useTranslation();
  const applyProfile = useApplyProfile();
  const phoneVerification = usePhoneVerification();
  const [editing, setEditing] = useState(false);
  const remove = useMutation({
    mutationFn: () => usersApi.updateMe({ phone: '' }),
    onSuccess: (updated) => {
      applyProfile(updated);
      notify.success(t('profile.phoneRemoved'));
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  const actionLabel = !profile.phone
    ? t('profile.addPhone')
    : profile.phoneVerified
      ? t('profile.changePhone')
      : t('profile.verifyPhone');
  const canRemove = Boolean(profile.phone) && MANAGER_ROLES.includes(profile.role);

  return (
    <View style={styles.stack}>
      <AppText variant="label">{t('auth.phone')}</AppText>
      <AppText>{profile.phone ? formatPhone(profile.phone) : t('profile.noPhone')}</AppText>
      {profile.phone ? (
        <Status
          ok={profile.phoneVerified}
          yes={t('profile.phoneVerified')}
          no={t('profile.phoneNotVerified')}
        />
      ) : null}
      {phoneVerification.isAvailable ? (
        <Button variant="secondary" onPress={() => setEditing(true)}>
          {actionLabel}
        </Button>
      ) : null}
      {canRemove ? (
        <Button variant="ghost" onPress={() => remove.mutate()} loading={remove.isPending}>
          {t('profile.removePhone')}
        </Button>
      ) : null}
      <Sheet open={editing} onClose={() => setEditing(false)} title={t('profile.changePhoneTitle')}>
        {editing ? (
          <ChangePhoneForm
            profile={profile}
            verify={phoneVerification.verify}
            onSaved={(updated) => {
              applyProfile(updated);
              notify.success(t('profile.phoneChanged'));
              setEditing(false);
            }}
          />
        ) : null}
      </Sheet>
      {phoneVerification.dialog}
    </View>
  );
}

function NotificationPreferences({ profile }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const applyProfile = useApplyProfile();
  const save = useMutation({
    mutationFn: usersApi.updatePreferences,
    onSuccess: (updated) => {
      applyProfile(updated);
      notify.success(t('profile.preferencesSaved'));
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  return PREFERENCES.map((key) => (
    <View key={key} style={styles.switchRow}>
      <View style={styles.flex}>
        <AppText weight="semibold">{t(`profile.pref.${key}`)}</AppText>
        <AppText variant="small" tone="muted">
          {t(`profile.pref.${key}Hint`)}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={t(`profile.pref.${key}`)}
        value={Boolean(profile.notificationPreferences[key])}
        disabled={save.isPending}
        onValueChange={(checked) => save.mutate({ [key]: checked })}
        trackColor={{ true: colors.brand, false: colors.border }}
      />
    </View>
  ));
}

export default function Profile() {
  const { t } = useTranslation();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const { logout } = useAuth();
  // Back to the home screen first, then end the session, so this screen never
  // flashes its signed-out redirect.
  const signOut = () => {
    router.dismissTo('/');
    logout.mutate();
  };
  const query = useQuery({
    queryKey: qk.me,
    queryFn: usersApi.getMe,
    enabled: status === AUTH_STATUS.AUTHENTICATED,
  });
  const profile = query.data;

  if (status === AUTH_STATUS.ANONYMOUS) return <Redirect href="/auth/login" />;

  return (
    <Screen
      title={t('profile.title')}
      subtitle={profile ? t('profile.roleLine', { role: t(`roles.${profile.role}`) }) : null}
    >
      {status === AUTH_STATUS.UNKNOWN || query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {profile ? (
        <>
          <Section title={t('profile.details')}>
            <ProfileForm key={profile.updatedAt} profile={profile} />
            <EmailSection profile={profile} />
            <PhoneSection profile={profile} />
          </Section>
          <Section title={t('profile.notifications')}>
            <NotificationPreferences profile={profile} />
          </Section>
          <Section title={t('profile.appearance')}>
            <View style={styles.switchRow}>
              <AppText style={styles.flex}>{t('common.language')}</AppText>
              <LanguageSwitcher />
            </View>
            <View style={styles.switchRow}>
              <AppText style={styles.flex}>{t('theme.label')}</AppText>
              <ThemeToggle />
            </View>
          </Section>
        </>
      ) : null}
      {status === AUTH_STATUS.AUTHENTICATED ? (
        <Button variant="danger" onPress={signOut} loading={logout.isPending}>
          {t('nav.logout')}
        </Button>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.lg },
  stack: { gap: SPACING.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  flex: { flex: 1 },
});
