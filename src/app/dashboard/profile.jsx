// My profile — adapted from frontend/src/pages/dashboard/Profile.jsx: details
// and photo, the email (confirmed by code), the phone (changed only through
// OTP), notification preferences, language and theme, and signing out.
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { authApi } from '../../api/auth.api.js';
import { endSession } from '../../api/client.js';
import { qk } from '../../api/queryKeys.js';
import { usersApi } from '../../api/users.api.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { LanguageSwitcher, ThemeToggle } from '../../components/common/Controls.jsx';
import DateField from '../../components/common/DateField.jsx';
import ImageField from '../../components/common/ImageField.jsx';
import PhoneField from '../../components/common/PhoneField.jsx';
import Screen from '../../components/common/Screen.jsx';
import StateDistrictFields from '../../components/common/StateDistrictFields.jsx';
import Sheet from '../../components/common/Sheet.jsx';
import { ErrorState, LoadingState } from '../../components/common/States.jsx';
import TextField from '../../components/common/TextField.jsx';
import { env } from '../../config/env.js';
import { useAuth } from '../../hooks/useAuth.js';
import { usePushPermission } from '../../hooks/usePush.js';
import { useCodeDialog } from '../../hooks/useCodeDialog.js';
import { usePhoneVerification } from '../../hooks/usePhoneVerification.js';
import { PUSH_BLOCKERS } from '../../lib/push/expoPush.js';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { notify } from '../../store/noticeStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import { isoYearsAgo } from '../../utils/dates.js';
import { JERSEY_MAX_LENGTH, ORGANISER_ROLES, OTP_CHANNELS, ROLES } from '../../utils/constants.js';
import { formatPhone, splitPhone } from '../../utils/countries.js';
import {
  changePasswordSchema,
  changePhoneSchema,
  profileSchemaFor,
  toLocationPayload,
  toLocationValues,
} from '../../utils/validation.js';

// Which notifications the account wants, and where. `push` is this phone, so
// its labels are the app's own (`app.*`); the rest are the website's wording.
const PREFERENCES = Object.freeze([
  {
    key: 'matchUpdates',
    label: 'profile.pref.matchUpdates',
    hint: 'profile.pref.matchUpdatesHint',
  },
  { key: 'results', label: 'profile.pref.results', hint: 'profile.pref.resultsHint' },
  { key: 'reminders', label: 'profile.pref.reminders', hint: 'profile.pref.remindersHint' },
  {
    key: 'registrations',
    label: 'profile.pref.registrations',
    hint: 'profile.pref.registrationsHint',
  },
  {
    key: 'announcements',
    label: 'profile.pref.announcements',
    hint: 'profile.pref.announcementsHint',
  },
  { key: 'push', label: 'app.prefPush', hint: 'app.prefPushHint' },
  { key: 'email', label: 'profile.pref.email', hint: 'profile.pref.emailHint' },
]);

// The ages the API accepts for a player (backend utils/validators.js), which
// bound the date-of-birth calendar so it cannot offer a date the server would
// refuse.
const MIN_PLAYER_AGE = 10;
const MAX_PLAYER_AGE = 60;

// Text inputs hold strings, so a number or a missing value becomes one here.
const toText = (value) => (value === null || value === undefined ? '' : String(value));

// The account's own view of itself carries its player half under `profile`
// (API users.serializer.serializeAccount): the jersey number, the
// measurements, the birthday and the age the server derived from it.
function toFormValues(account) {
  const player = account.profile ?? {};
  return {
    name: account.name,
    email: account.email ?? '',
    phone: account.phone ?? '',
    avatarUrl: account.avatarUrl ?? '',
    jerseyNumber: toText(player.jerseyNumber),
    heightCm: toText(player.heightCm),
    weightKg: toText(player.weightKg),
    dob: player.dob ? String(player.dob).slice(0, 10) : '',
    ...toLocationValues(account.location),
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
// is never sent from here — a number is saved through PhoneSection alone. The
// location goes the other way: the form holds it flat, the API takes it nested.
function toPayload({ phone: _phone, state, district, ...values }) {
  return { ...values, location: toLocationPayload({ state, district }) };
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

// Numbers already worn, offered beside the field. A number already in the
// field is not offered again, and somebody who has worn only one has nothing
// to choose from, so the row disappears rather than repeating what is there.
function SavedJerseys({ numbers, current, onPick }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const options = numbers.filter((number) => number !== current);
  if (options.length === 0) return null;
  return (
    <View style={styles.savedJerseys}>
      <AppText variant="small" tone="muted">
        {t('jerseys.worn')}
      </AppText>
      {options.map((number) => (
        <Pressable
          key={number}
          onPress={() => onPick(number)}
          accessibilityRole="button"
          accessibilityLabel={number}
          style={[styles.jerseyChip, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        >
          <AppText variant="small" weight="semibold">
            {number}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

function ProfileForm({ profile }) {
  const { t } = useTranslation();
  const applyProfile = useApplyProfile();
  const isPlayer = !ORGANISER_ROLES.includes(profile.role);
  const update = useMutation({
    mutationFn: usersApi.updateMe,
    onSuccess: (updated) => {
      applyProfile(updated);
      notify.success(t('profile.saved'));
    },
    onError: (error) => notify.error(apiErrorText(t, error)),
  });
  const {
    control,
    handleSubmit,
    watch,
    setValue,
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

  // The two pickers are driven together: picking a state clears the district.
  const setLocation = ({ state, district }) => {
    setValue('state', state, { shouldDirty: true });
    setValue('district', district, { shouldDirty: true });
  };

  return (
    <View style={styles.stack}>
      <Controller
        control={control}
        name="avatarUrl"
        render={({ field }) => (
          <ImageField
            label={t('profile.avatarUrl')}
            kind="avatar"
            round
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
      {/* The player half of the account. An organiser (Admin, Manager, Super
          Admin) has no player profile, so these are not shown to one and the
          schema does not ask for them (utils/validation.profileSchemaFor). */}
      {isPlayer ? (
        <>
          <Controller
            control={control}
            name="jerseyNumber"
            render={({ field }) => (
              <>
                <TextField
                  label={t('player.jerseyNumber')}
                  hint={t('profile.jerseyHint')}
                  keyboardType="number-pad"
                  maxLength={JERSEY_MAX_LENGTH}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.jerseyNumber}
                />
                {/* The numbers this player has worn, so going back to one is a
                    tap. A tournament may hand out another; this is the one the
                    profile shows. */}
                <SavedJerseys
                  numbers={profile.profile?.savedJerseyNumbers ?? []}
                  current={field.value}
                  onPick={field.onChange}
                />
              </>
            )}
          />
          <Controller
            control={control}
            name="dob"
            render={({ field }) => (
              <DateField
                label={t('player.dob')}
                placeholder={t('app.datePicker.pick')}
                // The age is the server's (profile.age), calendar-correct and
                // never computed here.
                hint={
                  profile.profile?.age === null || profile.profile?.age === undefined
                    ? undefined
                    : t('profile.ageLine', { age: profile.profile.age })
                }
                error={errors.dob}
                value={field.value}
                onChange={(value) => field.onChange(value)}
                min={isoYearsAgo(MAX_PLAYER_AGE)}
                max={isoYearsAgo(MIN_PLAYER_AGE)}
              />
            )}
          />
          <Controller
            control={control}
            name="heightCm"
            render={({ field }) => (
              <TextField
                label={t('player.heightCm')}
                keyboardType="number-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.heightCm}
              />
            )}
          />
          <Controller
            control={control}
            name="weightKg"
            render={({ field }) => (
              <TextField
                label={t('player.weightKg')}
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.weightKg}
              />
            )}
          />
        </>
      ) : null}
      <StateDistrictFields
        state={watch('state')}
        district={watch('district')}
        onChange={setLocation}
        errors={{ state: errors.state, district: errors.district }}
      />
      <Button
        onPress={handleSubmit((values) => update.mutate(toPayload(values)))}
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
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  const start = async () => {
    const otpToken = await ask(profile.email).catch((error) => {
      notify.error(apiErrorText(t, error));
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
    onError: (error) => notify.error(apiErrorText(t, error)),
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
      notify.error(apiErrorText(t, error));
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
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  const actionLabel = !profile.phone
    ? t('profile.addPhone')
    : profile.phoneVerified
      ? t('profile.changePhone')
      : t('profile.verifyPhone');
  const canRemove = Boolean(profile.phone) && ORGANISER_ROLES.includes(profile.role);

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

// What the account still owes, straight from the server's own answer
// (`profileState`). Nothing here is remembered by the app.
function CompletionStatus({ profile }) {
  const { t } = useTranslation();
  const state = profile.profileState;
  if (!state) return null;
  return (
    <View style={styles.stack} accessibilityLiveRegion="polite">
      <Status
        ok={state.profileComplete}
        yes={t('profile.complete')}
        no={t('profile.incomplete')}
      />
      {!state.profileComplete && state.missingFields?.length ? (
        <AppText variant="small" tone="muted">
          {t('profile.incompleteFields', {
            fields: state.missingFields.map((field) => t(`profile.field.${field}`)).join(', '),
          })}
        </AppText>
      ) : null}
      {state.mustChangePassword ? (
        <AppText variant="small" tone="warning">
          {t('profile.temporaryPassword')}
        </AppText>
      ) : null}
    </View>
  );
}

// Replacing the password. The API signs the account out everywhere, so this
// says so plainly, forgets the session on this device and sends the person to
// sign in again with the password they just chose.
function PasswordSection({ profile, openOnMount }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(openOnMount);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const change = useMutation({
    mutationFn: usersApi.changePassword,
    onSuccess: async () => {
      setEditing(false);
      // Leave the screen before the session ends, so the signed-out redirect
      // never flashes, then forget the refresh token on this device.
      router.replace('/auth/login');
      notify.success(t('profile.passwordChanged'));
      await endSession();
      queryClient.clear();
    },
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  const field = (name, label) => (
    <Controller
      control={control}
      name={name}
      render={({ field: input }) => (
        <TextField
          label={label}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
          value={input.value}
          onChangeText={input.onChange}
          onBlur={input.onBlur}
          error={errors[name]}
        />
      )}
    />
  );

  return (
    <Section title={t('profile.passwordTitle')}>
      {profile.mustChangePassword ? (
        <>
          <AppText variant="small" tone="warning">
            {t('profile.temporaryPassword')}
          </AppText>
          <AppText variant="small" tone="muted">
            {t('profile.temporaryPasswordHint')}
          </AppText>
        </>
      ) : (
        <AppText variant="small" tone="muted">
          {t('profile.passwordIntro')}
        </AppText>
      )}
      <Button variant="secondary" onPress={() => setEditing(true)}>
        {t('profile.changePassword')}
      </Button>
      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title={t('profile.changePassword')}
      >
        {editing ? (
          <View style={styles.stack}>
            <AppText variant="small" tone="muted">
              {t('profile.passwordSignsOut')}
            </AppText>
            {field('currentPassword', t('profile.currentPassword'))}
            {field('password', t('auth.newPassword'))}
            {field('confirmPassword', t('auth.confirmPassword'))}
            <Button
              onPress={handleSubmit((values) =>
                change.mutate({
                  currentPassword: values.currentPassword,
                  password: values.password,
                }),
              )}
              loading={change.isPending}
            >
              {t('profile.changePassword')}
            </Button>
          </View>
        ) : null}
      </Sheet>
    </Section>
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
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  return PREFERENCES.map(({ key, label, hint }) => (
    <View key={key} style={styles.switchRow}>
      <View style={styles.flex}>
        <AppText weight="semibold">{t(label)}</AppText>
        <AppText variant="small" tone="muted">
          {t(hint)}
        </AppText>
        {key === 'push' ? <PushState /> : null}
      </View>
      <Switch
        accessibilityLabel={t(label)}
        value={Boolean(profile.notificationPreferences[key])}
        disabled={save.isPending}
        onValueChange={(checked) => save.mutate({ [key]: checked })}
        trackColor={{ true: colors.brand, false: colors.border }}
      />
    </View>
  ));
}

// Wanting notifications is not enough: the phone has to allow them, and the
// build has to be able to ask for a token at all. Whichever is missing is said
// here, with the way to fix it.
function PushState() {
  const { t } = useTranslation();
  const permission = usePushPermission();
  if (!permission.blocker) return null;
  if (permission.blocker === PUSH_BLOCKERS.UNAVAILABLE) {
    return (
      <AppText variant="small" tone="warning">
        {t('app.pushUnavailable')}
      </AppText>
    );
  }
  return (
    <View style={styles.pushBlocked}>
      <AppText variant="small" tone="warning">
        {t('app.pushBlocked')}
      </AppText>
      <Button variant="secondary" onPress={permission.openSettings}>
        {t('app.openSettings')}
      </Button>
    </View>
  );
}

// Deleting the account. Google Play requires the app itself to offer it, so the
// whole flow lives here: what goes, what stays, the public page on the website,
// and a fresh proof (password, or a code to the number on the account) before
// it runs. The screen is left before the session ends, so the signed-out
// redirect above never flashes.
function DeleteAccountSection({ profile }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clear);
  const phoneVerification = usePhoneVerification();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');

  const remove = useMutation({
    mutationFn: usersApi.deleteAccount,
    onSuccess: () => {
      setOpen(false);
      router.dismissTo('/');
      notify.success(t('profile.deleteDone'));
      clearSession();
      queryClient.clear();
    },
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  const byOtp = async () => {
    const otpToken = await phoneVerification.verify(profile.phone).catch((error) => {
      notify.error(apiErrorText(t, error));
      return null;
    });
    if (otpToken) remove.mutate({ otpToken });
  };
  const canUseOtp =
    Boolean(profile.phone) && profile.phoneVerified && phoneVerification.isAvailable;

  return (
    <Section title={t('profile.deleteTitle')}>
      <AppText variant="small" tone="muted">
        {t('profile.deleteIntro')}
      </AppText>
      <View style={styles.stack}>
        <AppText variant="small" tone="muted">
          {`• ${t('profile.deleteErased')}`}
        </AppText>
        <AppText variant="small" tone="muted">
          {`• ${t('profile.deleteKept')}`}
        </AppText>
        <AppText variant="small" tone="muted">
          {`• ${t('profile.deleteFinal')}`}
        </AppText>
      </View>
      <Button
        variant="ghost"
        onPress={() => WebBrowser.openBrowserAsync(`${env.SITE_URL}/legal/deletion`)}
      >
        {t('profile.deleteLearnMore')}
      </Button>
      <Button variant="danger" onPress={() => setOpen(true)}>
        {t('profile.deleteAction')}
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('profile.deleteTitle')}>
        <View style={styles.stack}>
          <AppText>{t('profile.deleteConfirm')}</AppText>
          {profile.role === ROLES.CAPTAIN ? (
            <AppText variant="small" tone="warning">
              {t('profile.deleteCaptainNote')}
            </AppText>
          ) : null}
          <TextField
            label={t('auth.password')}
            hint={t('profile.deletePasswordHint')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
          />
          <Button
            variant="danger"
            disabled={!password}
            loading={remove.isPending}
            onPress={() => remove.mutate({ password })}
          >
            {t('profile.deleteAction')}
          </Button>
          {canUseOtp ? (
            <Button variant="ghost" disabled={remove.isPending} onPress={byOtp}>
              {t('profile.deleteWithOtp')}
            </Button>
          ) : null}
        </View>
      </Sheet>
      {phoneVerification.dialog}
    </Section>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const { logout } = useAuth();
  // The temporary-password reminder links straight to the password form
  // (components/common/NoticeHost.jsx).
  const params = useLocalSearchParams();
  const openPasswordSheet = params.changePassword === '1';
  // The button sits right below Delete account and wears the same danger
  // colour, so it asks first — signing back in costs a password, or an OTP
  // when that password has been forgotten.
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  // Back to the home screen first, then end the session, so this screen never
  // flashes its signed-out redirect.
  const signOut = () => {
    setConfirmingLogout(false);
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
            <CompletionStatus profile={profile} />
            <ProfileForm key={profile.updatedAt} profile={profile} />
            <EmailSection profile={profile} />
            <PhoneSection profile={profile} />
          </Section>
          <PasswordSection profile={profile} openOnMount={openPasswordSheet} />
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
          <DeleteAccountSection profile={profile} />
        </>
      ) : null}
      {status === AUTH_STATUS.AUTHENTICATED ? (
        <>
          <Button
            variant="danger"
            onPress={() => setConfirmingLogout(true)}
            loading={logout.isPending}
          >
            {t('nav.logout')}
          </Button>
          <ConfirmDialog
            open={confirmingLogout}
            title={t('nav.logout')}
            message={t('app.logoutConfirm')}
            confirmLabel={t('nav.logout')}
            loading={logout.isPending}
            onCancel={() => setConfirmingLogout(false)}
            onConfirm={signOut}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.lg },
  stack: { gap: SPACING.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  pushBlocked: { gap: SPACING.xs, marginTop: SPACING.xs },
  flex: { flex: 1 },
  savedJerseys: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  jerseyChip: {
    borderRadius: RADII.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
});
