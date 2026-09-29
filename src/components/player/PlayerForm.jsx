// Adapted from frontend/src/components/player/PlayerForm.jsx (and its
// playerFormValues.js). One form, four modes:
//   add        profile + squad fields (a player the captain types in)
//   profile    the profile only (editing a squad member's details)
//   membership jersey number and playing role only
//   invite     name + jersey + role, for a player invited by phone who fills in
//              the rest of their profile after signing up
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SPACING } from '../../theme/tokens.js';
import { PLAYING_ROLES } from '../../utils/constants.js';
import {
  invitePlayerSchema,
  membershipSchema,
  playerProfileSchema,
  playerSchema,
} from '../../utils/validation.js';
import AppText from '../common/AppText.jsx';
import Button from '../common/Button.jsx';
import ImageField from '../common/ImageField.jsx';
import SegmentedControl from '../common/SegmentedControl.jsx';
import TextField, { FieldMessages } from '../common/TextField.jsx';

export const EMPTY_PLAYER_PROFILE = Object.freeze({
  name: '',
  photoUrl: '',
  dob: '',
  heightCm: '',
  weightKg: '',
  hometown: '',
  bio: '',
});

// Text inputs hold strings, so heights and weights become ones here.
const toFormValue = (value) => (value === null || value === undefined ? '' : String(value));

export function toPlayerFormValues(player, membership) {
  const values = Object.fromEntries(
    Object.keys(EMPTY_PLAYER_PROFILE).map((key) => [key, toFormValue(player?.[key])]),
  );
  if (player?.dob) values.dob = String(player.dob).slice(0, 10);
  if (membership) {
    values.jerseyNumber = String(membership.jerseyNumber ?? '');
    values.playingRole = membership.playingRole;
  }
  return values;
}

const SCHEMAS = {
  add: playerSchema,
  profile: playerProfileSchema,
  membership: membershipSchema,
  invite: invitePlayerSchema,
};

function Field({ control, name, label, hint, error, ...inputProps }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          label={label}
          hint={hint}
          error={error}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          {...inputProps}
        />
      )}
    />
  );
}

export default function PlayerForm({
  mode = 'add',
  defaultValues,
  onSubmit,
  submitting,
  submitLabel,
}) {
  const { t } = useTranslation();
  const initial = defaultValues ?? {
    ...EMPTY_PLAYER_PROFILE,
    jerseyNumber: '',
    playingRole: 'raider',
  };
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(SCHEMAS[mode]), defaultValues: initial });

  const showName = mode !== 'membership';
  const showProfile = mode === 'add' || mode === 'profile';
  const showMembership = mode !== 'profile';

  return (
    <View style={styles.form}>
      {showName ? (
        <Field
          control={control}
          name="name"
          label={t('player.name')}
          error={errors.name}
          autoCapitalize="words"
        />
      ) : null}
      {showMembership ? (
        <>
          <Field
            control={control}
            name="jerseyNumber"
            label={t('player.jerseyNumber')}
            error={errors.jerseyNumber}
            keyboardType="number-pad"
          />
          <View style={styles.role}>
            <AppText variant="label">{t('player.playingRole')}</AppText>
            <Controller
              control={control}
              name="playingRole"
              render={({ field }) => (
                <SegmentedControl
                  label={t('player.playingRole')}
                  value={field.value}
                  onChange={field.onChange}
                  options={PLAYING_ROLES.map((role) => ({
                    value: role,
                    label: t(`playingRole.${role}`),
                  }))}
                />
              )}
            />
            <FieldMessages error={errors.playingRole} />
          </View>
        </>
      ) : null}
      {showProfile ? (
        <>
          <Controller
            control={control}
            name="photoUrl"
            render={({ field }) => (
              <ImageField
                label={t('player.photo')}
                kind="player_photo"
                round
                name={watch('name')}
                value={field.value}
                onChange={field.onChange}
                error={errors.photoUrl}
              />
            )}
          />
          <Field
            control={control}
            name="dob"
            label={t('player.dob')}
            hint={t('app.dateFormatHint')}
            error={errors.dob}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <Field
            control={control}
            name="hometown"
            label={t('player.hometown')}
            error={errors.hometown}
          />
          <Field
            control={control}
            name="heightCm"
            label={t('player.heightCm')}
            error={errors.heightCm}
            keyboardType="number-pad"
          />
          <Field
            control={control}
            name="weightKg"
            label={t('player.weightKg')}
            error={errors.weightKg}
            keyboardType="decimal-pad"
          />
          <Field
            control={control}
            name="bio"
            label={t('player.bio')}
            error={errors.bio}
            multiline
            numberOfLines={3}
            inputStyle={styles.textarea}
          />
        </>
      ) : null}
      {submitLabel ? (
        <Button onPress={handleSubmit(onSubmit)} loading={submitting}>
          {submitLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: SPACING.md },
  role: { gap: SPACING.xs },
  textarea: { minHeight: 80, textAlignVertical: 'top', paddingTop: SPACING.sm },
});
