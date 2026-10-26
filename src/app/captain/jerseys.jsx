// This competition's shirt numbers for the captain's own squad — adapted from
// frontend/src/pages/dashboard/TournamentJerseys.jsx. The organiser's half of
// that screen (setting another team's numbers) stays on the website; here the
// team is always the signed-in captain's.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { qk } from '../../api/queryKeys.js';
import { tournamentsApi } from '../../api/tournaments.api.js';
import AppText from '../../components/common/AppText.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Button from '../../components/common/Button.jsx';
import { Card } from '../../components/common/Layout.jsx';
import TextField from '../../components/common/TextField.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import CaptainScreen from '../../components/team/CaptainScreen.jsx';
import { notify } from '../../store/noticeStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import { JERSEY_MAX_LENGTH } from '../../utils/constants.js';

const digitsOnly = (value) => value.replace(/\D/g, '').slice(0, JERSEY_MAX_LENGTH);

// A player has three numbers at most: their own, their squad's and this
// competition's. The row says which is in use and where it came from, so an
// empty field reads as "the squad's number" rather than as a missing number.
function JerseyRow({ row, value, onChange }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const fallback = row.squadJerseyNumber ?? row.defaultJerseyNumber;
  const saved = row.savedJerseyNumbers.filter((number) => number !== value);

  return (
    <Card style={styles.row}>
      <Avatar src={row.player.photoUrl} name={row.player.name} size="sm" />
      <View style={styles.flex}>
        <AppText weight="semibold" numberOfLines={1}>
          {row.player.name}
        </AppText>
        <AppText variant="small" tone="muted">
          {value ? t('jerseys.inThisTournament') : t('jerseys.fallsBackTo', { number: fallback })}
        </AppText>
        {saved.length > 0 ? (
          <View style={styles.saved}>
            <AppText variant="small" tone="muted">
              {t('jerseys.worn')}
            </AppText>
            {saved.map((number) => (
              <Pressable
                key={number}
                onPress={() => onChange(number)}
                accessibilityRole="button"
                accessibilityLabel={number}
                style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              >
                <AppText variant="small" weight="semibold">
                  {number}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.field}>
        <TextField
          label={t('jerseys.numberFor', { name: row.player.name })}
          labelHidden
          keyboardType="number-pad"
          maxLength={JERSEY_MAX_LENGTH}
          placeholder={fallback ?? ''}
          value={value}
          onChangeText={(text) => onChange(digitsOnly(text))}
        />
      </View>
    </Card>
  );
}

export default function TournamentJerseys() {
  const { t } = useTranslation();
  const { tournamentId } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({});

  return (
    <CaptainScreen title={t('jerseys.title')} subtitle={t('jerseys.subtitle')}>
      {(team) => (
        <JerseyList
          team={team}
          tournamentId={String(tournamentId)}
          draft={draft}
          setDraft={setDraft}
          queryClient={queryClient}
        />
      )}
    </CaptainScreen>
  );
}

function JerseyList({ team, tournamentId, draft, setDraft, queryClient }) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: qk.tournaments.jerseys(tournamentId, team.id),
    queryFn: () => tournamentsApi.jerseys(tournamentId, team.id),
  });

  // The saved numbers are the starting point; what is typed survives a refetch.
  useEffect(() => {
    if (!query.data) return;
    setDraft(
      Object.fromEntries(
        query.data.items.map((row) => [row.player.id, row.tournamentJerseyNumber ?? '']),
      ),
    );
  }, [query.data, setDraft]);

  const save = useMutation({
    mutationFn: (jerseys) => tournamentsApi.setJerseys(tournamentId, team.id, jerseys),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.tournaments.jerseys(tournamentId, team.id), data);
      notify.success(t('jerseys.saved'));
    },
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.items.length === 0) return <EmptyState title={t('jerseys.emptySquad')} />;

  return (
    <View style={styles.stack}>
      {query.data.items.map((row) => (
        <JerseyRow
          key={row.player.id}
          row={row}
          value={draft[row.player.id] ?? ''}
          onChange={(number) => setDraft((current) => ({ ...current, [row.player.id]: number }))}
        />
      ))}
      <Button
        loading={save.isPending}
        onPress={() =>
          save.mutate(
            Object.entries(draft).map(([playerId, jerseyNumber]) => ({ playerId, jerseyNumber })),
          )
        }
      >
        {t('common.saveChanges')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: SPACING.sm },
  flex: { flex: 1, gap: 2 },
  saved: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: { borderRadius: RADII.full, borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  field: { width: 84 },
});
