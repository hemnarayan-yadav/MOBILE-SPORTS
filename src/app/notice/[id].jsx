// One announced tournament, in full. The poster carries most of it; the fields
// below are what a reader needs to act on — where, when, what it costs and who
// to call.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { noticesApi } from '../../api/notices.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import Screen from '../../components/common/Screen.jsx';
import SelectSheetField from '../../components/common/SelectSheetField.jsx';
import Sheet from '../../components/common/Sheet.jsx';
import { ErrorState, LoadingState } from '../../components/common/States.jsx';
import TextField from '../../components/common/TextField.jsx';
import { notify } from '../../store/noticeStore.js';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import { formatDate } from '../../utils/format.js';

// The reasons the API accepts. `other` has to say what is wrong.
const REASONS = Object.freeze(['not_real', 'wrong_details', 'offensive', 'spam', 'other']);

function Detail({ icon, label, value }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <View style={styles.detailText}>
        <AppText variant="small" tone="muted">
          {label}
        </AppText>
        <AppText>{value}</AppText>
      </View>
    </View>
  );
}

export default function NoticeDetail() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const signedIn = useAuthStore((state) => state.status) === AUTH_STATUS.AUTHENTICATED;
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');

  const query = useQuery({
    queryKey: qk.notices.item(id),
    queryFn: () => noticesApi.get(id),
  });

  const report = useMutation({
    mutationFn: () => noticesApi.report(id, { reason, note: note.trim() || undefined }),
    onSuccess: () => {
      setReporting(false);
      setNote('');
      notify.success(t('notices.reportSent'));
    },
    // A second report from the same account answers 409; the reader is told
    // plainly rather than left pressing a button that does nothing.
    onError: (err) => notify.error(apiErrorText(t, err)),
  });

  const notice = query.data;
  const place = [notice?.venue, notice?.location?.district].filter(Boolean).join(', ');
  // `contacts` is what the API answers now; `contactPhone` is what it answered
  // when this screen was written, and still answers for a notice submitted
  // before the list existed.
  const contacts = notice?.contacts?.length
    ? notice.contacts
    : notice?.contactPhone
      ? [{ name: null, phone: notice.contactPhone }]
      : [];
  const needsNote = reason === 'other' && !note.trim();

  return (
    <Screen title={notice?.title ?? t('notices.tabTournaments')}>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}

      {notice ? (
        <ScrollView contentContainerStyle={styles.content}>
          {notice.posterUrl ? (
            <Image
              source={{ uri: notice.posterUrl }}
              style={[styles.poster, { borderColor: colors.border }]}
              // The poster is a designed graphic: every date and prize on it
              // matters, so it is never cropped.
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}

          <Detail
            icon="calendar-outline"
            label={t('notices.dateLabel')}
            value={`${formatDate(notice.startDate)}${notice.startTime ? ` · ${notice.startTime}` : ''}`}
          />
          <Detail icon="location-outline" label={t('notices.venueLabel')} value={place} />
          <Detail icon="cash-outline" label={t('notices.entryFeeLabel')} value={notice.entryFee} />
          <Detail icon="person-outline" label={t('notices.organiserLabel')} value={notice.organiserName} />
          <Detail icon="document-text-outline" label={t('notices.rulesLabel')} value={notice.rules} />

          {/* Won by one player rather than by placing — बेस्ट रेडर, मैन ऑफ द सीरीज —
              and announced before the tournament, which is half of why players
              turn up. */}
          {notice.awards?.length ? (
            <View style={styles.block}>
              <AppText variant="small" tone="muted">
                {t('notices.awardsLabel')}
              </AppText>
              {notice.awards.map((award) => (
                <View key={award.title} style={styles.prizeRow}>
                  <AppText tone="muted">{award.title}</AppText>
                  <AppText weight="semibold">{award.prize}</AppText>
                </View>
              ))}
            </View>
          ) : null}

          {notice.prizes?.length ? (
            <View style={styles.block}>
              <AppText variant="small" tone="muted">
                {t('notices.prizesLabel')}
              </AppText>
              {notice.prizes.map((prize) => (
                <View key={prize.position} style={styles.prizeRow}>
                  <AppText tone="muted">{t('notices.positionPrize', { position: prize.position })}</AppText>
                  <AppText weight="semibold">{prize.prize}</AppText>
                </View>
              ))}
            </View>
          ) : null}

          {notice.description ? <AppText>{notice.description}</AppText> : null}

          {/* A poster prints two or three numbers because one of them will not
              pick up, and the name matters as much as the number: it is who a
              captain asks for. */}
          {contacts.map((contact) => (
            <Button
              key={contact.phone}
              onPress={() => Linking.openURL(`tel:${contact.phone}`).catch(() => {})}
            >
              {contact.name ? `${contact.name} · ${contact.phone}` : contact.phone}
            </Button>
          ))}

          {/* Anyone signed in may flag a notice. Play's user-generated content
              policy wants reporting as well as moderation, and an approved
              notice can still turn out to be fake or stale. */}
          {signedIn ? (
            <Button variant="secondary" onPress={() => setReporting(true)}>
              {t('notices.report')}
            </Button>
          ) : null}
        </ScrollView>
      ) : null}

      <Sheet open={reporting} onClose={() => setReporting(false)} title={t('notices.reportTitle')}>
        <View style={styles.block}>
          <AppText variant="small" tone="muted">
            {t('notices.reportHint')}
          </AppText>
          <SelectSheetField
            label={t('notices.reportReasonLabel')}
            value={reason}
            onChange={setReason}
            options={REASONS.map((value) => ({ value, label: t(`notices.reason.${value}`) }))}
          />
          <TextField
            label={t('notices.reportNoteLabel')}
            value={note}
            onChangeText={setNote}
            multiline
          />
          <Button onPress={() => report.mutate()} loading={report.isPending} disabled={needsNote}>
            {t('notices.report')}
          </Button>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.md },
  poster: { width: '100%', aspectRatio: 3 / 4, borderRadius: RADII.xl, borderWidth: 1 },
  detail: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  detailText: { flex: 1 },
  block: { gap: SPACING.sm },
  prizeRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
