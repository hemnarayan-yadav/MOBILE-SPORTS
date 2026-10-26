// Adapted from frontend/src/components/team/TeamForm.jsx (and its
// teamFormValues.js): the same schema, the same fields, laid out one per row
// for a phone.
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SPACING } from '../../theme/tokens.js';
import { teamSchema, toLocationPayload, toLocationValues } from '../../utils/validation.js';
import AppText from '../common/AppText.jsx';
import Button from '../common/Button.jsx';
import ImageField from '../common/ImageField.jsx';
import PhoneField from '../common/PhoneField.jsx';
import StateDistrictFields from '../common/StateDistrictFields.jsx';
import TextField from '../common/TextField.jsx';

export const EMPTY_TEAM_VALUES = Object.freeze({
  name: '',
  shortName: '',
  city: '',
  state: '',
  district: '',
  homeGround: '',
  foundedYear: '',
  description: '',
  logoUrl: '',
  bannerUrl: '',
  coachName: '',
  coachPhone: '',
  teamManagerName: '',
  teamManagerPhone: '',
});

// Text inputs hold strings, so a number (the founding year) becomes one here.
const toFormValue = (value) => (value === null || value === undefined ? '' : String(value));

// The coach and the team's own manager: nested on the API, flat in the form.
// A visitor is given the name alone, so a form built from a team somebody else
// manages simply has no number to show.
const toStaffValues = (prefix, staff) => ({
  [`${prefix}Name`]: staff?.name ?? '',
  [`${prefix}Phone`]: staff?.phone ?? '',
});

export function toTeamFormValues(team) {
  if (!team) return EMPTY_TEAM_VALUES;
  return {
    ...Object.fromEntries(
      Object.keys(EMPTY_TEAM_VALUES).map((key) => [key, toFormValue(team[key])]),
    ),
    // The API nests these; the form holds them flat.
    ...toLocationValues(team.location),
    ...toStaffValues('coach', team.coach),
    ...toStaffValues('teamManager', team.teamManager),
  };
}

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

export default function TeamForm({
  defaultValues = EMPTY_TEAM_VALUES,
  onSubmit,
  submitting,
  submitLabel,
}) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(teamSchema), defaultValues });

  // The two pickers are driven together: picking a state clears the district.
  const setLocation = ({ state, district }) => {
    setValue('state', state, { shouldDirty: true });
    setValue('district', district, { shouldDirty: true });
  };

  // The form holds the location and the two staff halves flat; the API takes
  // them nested.
  const submit = ({
    state,
    district,
    coachName,
    coachPhone,
    teamManagerName,
    teamManagerPhone,
    ...values
  }) =>
    onSubmit({
      ...values,
      location: toLocationPayload({ state, district }),
      coach: { name: coachName || null, phone: coachPhone || null },
      teamManager: { name: teamManagerName || null, phone: teamManagerPhone || null },
    });

  return (
    <View style={styles.form}>
      <AppText variant="label" tone="muted">
        {t('team.identity')}
      </AppText>
      <Field
        control={control}
        name="name"
        label={t('team.name')}
        error={errors.name}
        autoCapitalize="words"
      />
      <Field
        control={control}
        name="shortName"
        label={t('team.shortName')}
        hint={t('team.shortNameHint')}
        error={errors.shortName}
        maxLength={5}
        autoCapitalize="characters"
      />
      <Controller
        control={control}
        name="logoUrl"
        render={({ field }) => (
          <ImageField
            label={t('team.logo')}
            kind="team_logo"
            name={watch('shortName')}
            value={field.value}
            onChange={field.onChange}
            error={errors.logoUrl}
          />
        )}
      />
      <Controller
        control={control}
        name="bannerUrl"
        render={({ field }) => (
          <ImageField
            label={t('team.banner')}
            kind="team_banner"
            value={field.value}
            onChange={field.onChange}
            error={errors.bannerUrl}
          />
        )}
      />

      <AppText variant="label" tone="muted">
        {t('team.details')}
      </AppText>
      <Field control={control} name="city" label={t('team.city')} error={errors.city} />
      <Field
        control={control}
        name="homeGround"
        label={t('team.homeGround')}
        error={errors.homeGround}
      />
      <Field
        control={control}
        name="foundedYear"
        label={t('team.foundedYear')}
        error={errors.foundedYear}
        keyboardType="number-pad"
      />
      <StateDistrictFields
        state={watch('state')}
        district={watch('district')}
        onChange={setLocation}
        errors={{ state: errors.state, district: errors.district }}
      />
      <Field
        control={control}
        name="description"
        label={t('team.description')}
        error={errors.description}
        multiline
        numberOfLines={4}
        inputStyle={styles.textarea}
      />

      {/* Nobody has to fill this in: a team may name a coach today, add the
          number later, or never name either. The numbers are not public. */}
      <AppText variant="label" tone="muted">
        {t('team.staff')}
      </AppText>
      <AppText variant="small" tone="muted">
        {t('team.staffHint')}
      </AppText>
      <Field
        control={control}
        name="coachName"
        label={t('team.coachName')}
        error={errors.coachName}
        autoCapitalize="words"
      />
      <Controller
        control={control}
        name="coachPhone"
        render={({ field }) => (
          <PhoneField
            label={t('team.coachPhone')}
            value={field.value}
            onChange={field.onChange}
            error={errors.coachPhone}
          />
        )}
      />
      <Field
        control={control}
        name="teamManagerName"
        label={t('team.teamManagerName')}
        error={errors.teamManagerName}
        autoCapitalize="words"
      />
      <Controller
        control={control}
        name="teamManagerPhone"
        render={({ field }) => (
          <PhoneField
            label={t('team.teamManagerPhone')}
            value={field.value}
            onChange={field.onChange}
            error={errors.teamManagerPhone}
          />
        )}
      />

      <Button onPress={handleSubmit(submit)} loading={submitting}>
        {submitLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: SPACING.md },
  textarea: { minHeight: 96, textAlignVertical: 'top', paddingTop: SPACING.sm },
});
