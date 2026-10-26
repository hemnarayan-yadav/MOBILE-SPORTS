// Announcing a tournament somebody else is running. Open to any signed-in
// account, which is why nothing here is published on submission: it goes to a
// moderator first, and the form says so before the person types anything.
//
// The poster is usually the whole announcement — village Kabaddi is advertised
// as a graphic — so it comes first and everything under it is optional except
// the name and the date. An organiser who only has a poster can still post.
import { useMutation } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { noticesApi } from '../../api/notices.api.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import DateField from '../../components/common/DateField.jsx';
import ImageField from '../../components/common/ImageField.jsx';
import Screen from '../../components/common/Screen.jsx';
import StateDistrictFields from '../../components/common/StateDistrictFields.jsx';
import TextField from '../../components/common/TextField.jsx';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorKey } from '../../utils/apiErrors.js';

// Four is what a village poster offers: प्रथम, द्वितीय, तृतीय, चतुर्थ.
const PRIZE_POSITIONS = Object.freeze([1, 2, 3, 4]);
const TITLE_MIN_LENGTH = 5;

// Blank optional fields are left out entirely rather than sent as empty
// strings, so the API stores a null instead of an empty value.
const omitBlank = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed ? trimmed : undefined;
};

export default function AnnounceTournament() {
  const { t } = useTranslation();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const [form, setForm] = useState({
    title: '',
    posterUrl: '',
    startDate: '',
    startTime: '',
    venue: '',
    entryFee: '',
    rules: '',
    organiserName: '',
    contactPhone: '',
  });
  const [location, setLocation] = useState({ state: '', district: '' });
  const [prizes, setPrizes] = useState(() => PRIZE_POSITIONS.map(() => ''));

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = useMutation({
    mutationFn: () =>
      noticesApi.submit({
        title: form.title.trim(),
        startDate: form.startDate,
        posterUrl: omitBlank(form.posterUrl),
        startTime: omitBlank(form.startTime),
        venue: omitBlank(form.venue),
        entryFee: omitBlank(form.entryFee),
        rules: omitBlank(form.rules),
        organiserName: omitBlank(form.organiserName),
        contactPhone: omitBlank(form.contactPhone),
        ...(location.state ? { location } : {}),
        // Only the positions actually filled in, in poster order.
        prizes: prizes
          .map((prize, index) => ({ position: PRIZE_POSITIONS[index], prize: prize.trim() }))
          .filter((entry) => entry.prize),
      }),
    onSuccess: () => {
      notify.success(t('notices.announceSent'));
      router.back();
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  if (status === AUTH_STATUS.ANONYMOUS) return <Redirect href="/auth/login" />;

  const ready = form.title.trim().length >= TITLE_MIN_LENGTH && Boolean(form.startDate);

  return (
    <Screen title={t('notices.announce')}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Said before anything is typed, not after it is sent. */}
        <AppText variant="small" tone="muted">
          {t('notices.announceHint')}
        </AppText>

        <ImageField
          label={t('notices.fieldPoster')}
          kind="tournament_banner"
          value={form.posterUrl}
          onChange={set('posterUrl')}
        />

        <TextField
          label={t('notices.fieldTitle')}
          value={form.title}
          onChangeText={set('title')}
        />
        <DateField
          label={t('notices.fieldStartDate')}
          value={form.startDate}
          onChange={set('startDate')}
        />
        <TextField
          label={t('notices.fieldStartTime')}
          value={form.startTime}
          onChangeText={set('startTime')}
          placeholder="20:30"
        />
        <TextField
          label={t('notices.fieldVenue')}
          value={form.venue}
          onChangeText={set('venue')}
        />

        <StateDistrictFields
          state={location.state}
          district={location.district}
          onChange={setLocation}
        />

        <View style={styles.block}>
          <AppText variant="small" tone="muted">
            {t('notices.prizesLabel')}
          </AppText>
          {PRIZE_POSITIONS.map((position, index) => (
            <TextField
              key={position}
              label={t('notices.fieldPrize', { position })}
              value={prizes[index]}
              onChangeText={(value) =>
                setPrizes((current) => current.map((p, i) => (i === index ? value : p)))
              }
            />
          ))}
        </View>

        <TextField
          label={t('notices.fieldEntryFee')}
          value={form.entryFee}
          onChangeText={set('entryFee')}
        />
        <TextField
          label={t('notices.fieldRules')}
          value={form.rules}
          onChangeText={set('rules')}
          multiline
        />
        <TextField
          label={t('notices.fieldOrganiser')}
          value={form.organiserName}
          onChangeText={set('organiserName')}
        />
        <TextField
          label={t('notices.fieldContact')}
          value={form.contactPhone}
          onChangeText={set('contactPhone')}
          keyboardType="phone-pad"
        />

        <Button onPress={() => submit.mutate()} loading={submit.isPending} disabled={!ready}>
          {t('notices.announce')}
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.md },
  block: { gap: SPACING.sm },
});
