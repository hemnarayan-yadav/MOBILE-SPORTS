// Announcing a tournament somebody else is running. Open to any signed-in
// account, which is why nothing here is published on submission: it goes to a
// moderator first, and the form says so before the person types anything.
//
// The poster is usually the whole announcement — village Kabaddi is advertised
// as a graphic — so it comes first and everything under it is optional except
// the name and the date. An organiser who only has a poster can still post,
// and where the server can read posters, the poster fills the form in.
//
// Adapted from frontend/src/pages/dashboard/AnnounceNotice.jsx: the same
// fields, the same reading (utils/noticeDraft.js) and the same repeat check.
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { noticesApi } from '../../api/notices.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import DateField from '../../components/common/DateField.jsx';
import ImageField from '../../components/common/ImageField.jsx';
import { Card } from '../../components/common/Layout.jsx';
import Screen from '../../components/common/Screen.jsx';
import StateDistrictFields from '../../components/common/StateDistrictFields.jsx';
import TextField from '../../components/common/TextField.jsx';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import { formatDate } from '../../utils/format.js';
import {
  NOTICE_DEFAULTS,
  PRIZE_POSITIONS,
  draftFields,
  noticePayload,
  posterWarningKey,
  posterWarningKeyFor,
} from '../../utils/noticeDraft.js';
import { noticeSchema } from '../../utils/validation.js';

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

function DateInput({ control, name, label, hint, error }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DateField
          label={label}
          hint={hint}
          error={error}
          value={field.value}
          onChange={field.onChange}
        />
      )}
    />
  );
}

// What the last reading filled, what had no row, and what it had to assume.
function ReadingSummary({ review }) {
  const { t } = useTranslation();
  return (
    <View style={styles.summary}>
      <AppText variant="small">{t('notices.posterRead', { count: review.filled })}</AppText>
      {review.dropped > 0 ? (
        <AppText variant="small" tone="muted">
          {t('notices.posterDropped', { count: review.dropped })}
        </AppText>
      ) : null}
      {review.warnings.map((warning) => (
        <AppText key={`${warning.field}-${warning.code}`} variant="small" tone="muted">
          • {t(posterWarningKey(warning.code))}
        </AppText>
      ))}
    </View>
  );
}

export default function AnnounceTournament() {
  const { t } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(noticeSchema), defaultValues: NOTICE_DEFAULTS });

  // The upload the poster reader is pointed at, and what it said about what it
  // read. Null until a poster is uploaded on this screen: only a fresh upload
  // has an id to name it by.
  const [posterAsset, setPosterAsset] = useState(null);
  const [review, setReview] = useState(null);

  // Only where the server has a reader behind it. Staging has none, and an
  // offer that always fails is worse than no offer.
  const { data: config } = useQuery({
    queryKey: qk.notices.config,
    queryFn: noticesApi.config,
    staleTime: Infinity,
  });
  const canReadPoster = Boolean(config?.posterReader);

  // The two pickers are driven together: picking a state clears the district.
  const setLocation = ({ state, district }) => {
    setValue('state', state, { shouldDirty: true });
    setValue('district', district, { shouldDirty: true });
  };

  // The draft into the form, as suggestions: it fills, never clears, and
  // never submits.
  const applyDraft = (draft) => {
    const { fields, location, dropped } = draftFields(draft);
    fields.forEach(([name, value]) =>
      setValue(name, value, { shouldDirty: true, shouldValidate: true }),
    );
    if (location) setLocation(location);
    return { filled: fields.length, dropped };
  };

  const read = useMutation({
    mutationFn: () => noticesApi.extractPoster(posterAsset.id),
    onSuccess: ({ draft, warnings }) => setReview({ ...applyDraft(draft), warnings }),
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  // The note a field carries after a reading, where the reader was unsure.
  const warningFor = (field) => {
    const key = posterWarningKeyFor(review?.warnings, field);
    return key ? t(key) : undefined;
  };

  // The same name on the same day is usually a repeat, but two villages do
  // hold one on the same Sunday — so the API asks rather than refuses, and
  // this holds the submission while the organiser decides.
  const [clash, setClash] = useState(null);

  const submit = useMutation({
    mutationFn: ({ values, allowDuplicate }) =>
      noticesApi.submit({
        ...noticePayload(values),
        ...(allowDuplicate ? { allowDuplicate } : {}),
      }),
    onSuccess: () => {
      setClash(null);
      client.invalidateQueries({ queryKey: qk.notices.all });
      notify.success(t('notices.announceSent'));
      router.back();
    },
    onError: (error, variables) => {
      if (error?.code === 'NOTICE_SIMILAR_EXISTS') {
        setClash({ values: variables.values, existing: error.details ?? null });
        return;
      }
      notify.error(apiErrorText(t, error));
    },
  });

  if (status === AUTH_STATUS.ANONYMOUS) return <Redirect href="/auth/login" />;

  return (
    <Screen title={t('notices.announce')}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Said before anything is typed, not after it is sent. */}
        <AppText variant="small" tone="muted">
          {t('notices.announceHint')}
        </AppText>

        <Controller
          control={control}
          name="posterUrl"
          render={({ field }) => (
            <ImageField
              label={t('notices.fieldPoster')}
              kind="tournament_banner"
              value={field.value}
              onChange={field.onChange}
              onUploaded={(asset) => {
                setPosterAsset(asset);
                // A new poster makes the last reading meaningless.
                setReview(null);
              }}
              error={errors.posterUrl}
            />
          )}
        />

        {/* Reading the poster fills the form in; it never submits it. The
            button only appears once there is an upload to name by id. */}
        {posterAsset && canReadPoster ? (
          <Card style={styles.block}>
            <Button variant="secondary" loading={read.isPending} onPress={() => read.mutate()}>
              {t('notices.fillFromPoster')}
            </Button>
            <AppText variant="small" tone="muted">
              {t('notices.fillFromPosterHint')}
            </AppText>
            {review ? <ReadingSummary review={review} /> : null}
          </Card>
        ) : null}

        <Field
          control={control}
          name="title"
          label={t('notices.fieldTitle')}
          error={errors.title}
        />
        <DateInput
          control={control}
          name="startDate"
          label={t('notices.fieldStartDate')}
          hint={warningFor('startDate')}
          error={errors.startDate}
        />
        <DateInput
          control={control}
          name="endDate"
          label={t('notices.fieldEndDate')}
          hint={warningFor('endDate')}
          error={errors.endDate}
        />
        <Field
          control={control}
          name="startTime"
          label={t('notices.fieldStartTime')}
          error={errors.startTime}
          placeholder="20:30"
        />
        <Field
          control={control}
          name="venue"
          label={t('notices.fieldVenue')}
          error={errors.venue}
        />

        <StateDistrictFields
          state={watch('state')}
          district={watch('district')}
          onChange={setLocation}
          errors={{ state: errors.state, district: errors.district }}
        />

        <Card style={styles.block}>
          <AppText variant="label" tone="muted">
            {t('notices.prizesLabel')}
          </AppText>
          {PRIZE_POSITIONS.map((position, index) => (
            <Field
              key={position}
              control={control}
              name={`prizes.${index}`}
              label={t('notices.fieldPrize', { position })}
              error={errors.prizes?.[index]}
            />
          ))}
        </Card>

        {/* Won by a player rather than by placing — बेस्ट रेडर, मैन ऑफ द
            सीरीज — and announced on the poster before the tournament. */}
        <Card style={styles.block}>
          <AppText variant="label" tone="muted">
            {t('notices.awardsLabel')}
          </AppText>
          <AppText variant="small" tone="muted">
            {t('notices.awardsHint')}
          </AppText>
          {NOTICE_DEFAULTS.awards.map((_row, index) => (
            <View key={index} style={styles.row}>
              <Field
                control={control}
                name={`awards.${index}.title`}
                label={t('notices.fieldAwardTitle')}
                error={errors.awards?.[index]?.title}
              />
              <Field
                control={control}
                name={`awards.${index}.prize`}
                label={t('notices.fieldAwardPrize')}
                error={errors.awards?.[index]?.prize}
              />
            </View>
          ))}
        </Card>

        {/* A poster prints two or three numbers because one of them will not
            pick up, and the name matters as much as the number. */}
        <Card style={styles.block}>
          <AppText variant="label" tone="muted">
            {t('notices.contactLabel')}
          </AppText>
          {NOTICE_DEFAULTS.contacts.map((_row, index) => (
            <View key={index} style={styles.row}>
              <Field
                control={control}
                name={`contacts.${index}.name`}
                label={t('notices.fieldContactName')}
                error={errors.contacts?.[index]?.name}
              />
              <Field
                control={control}
                name={`contacts.${index}.phone`}
                label={t('notices.fieldContact')}
                error={errors.contacts?.[index]?.phone}
                keyboardType="phone-pad"
              />
            </View>
          ))}
        </Card>

        <Field
          control={control}
          name="entryFee"
          label={t('notices.fieldEntryFee')}
          error={errors.entryFee}
        />
        <Field
          control={control}
          name="organiserName"
          label={t('notices.fieldOrganiser')}
          error={errors.organiserName}
        />
        <Field
          control={control}
          name="rules"
          label={t('notices.fieldRules')}
          error={errors.rules}
          multiline
        />
        <Field
          control={control}
          name="description"
          label={t('notices.fieldDescription')}
          error={errors.description}
          multiline
        />

        <Button
          onPress={handleSubmit((values) => submit.mutate({ values, allowDuplicate: false }))}
          loading={submit.isPending}
        >
          {t('notices.announce')}
        </Button>
      </ScrollView>

      <ConfirmDialog
        open={Boolean(clash)}
        tone="primary"
        title={t('notices.duplicateTitle')}
        message={
          clash?.existing
            ? t('notices.duplicateMessage', {
                title: clash.existing.title,
                date: formatDate(clash.existing.startDate),
              })
            : t('notices.duplicateMessageShort')
        }
        confirmLabel={t('notices.duplicateConfirm')}
        loading={submit.isPending}
        onConfirm={() => submit.mutate({ values: clash.values, allowDuplicate: true })}
        onCancel={() => setClash(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.md },
  block: { gap: SPACING.sm },
  row: { gap: SPACING.sm },
  summary: { gap: SPACING.xs, paddingTop: SPACING.sm },
});
