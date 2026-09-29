// Tournaments for the captain — adapted from CaptainTournaments in
// frontend/src/pages/dashboard/captain/CaptainPages.jsx: the ones open for
// entry, and the team's own entries with their decision.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { qk } from '../../api/queryKeys.js';
import { teamsApi } from '../../api/teams.api.js';
import { tournamentsApi } from '../../api/tournaments.api.js';
import AppText from '../../components/common/AppText.jsx';
import { StatusBadge } from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import { Card, TabStrip } from '../../components/common/Layout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import CaptainScreen from '../../components/team/CaptainScreen.jsx';
import { TournamentCard } from '../../components/tournament/TournamentBits.jsx';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { KABADDI, TEAM_STATUS } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';

const OPEN_PARAMS = { status: 'registration_open', limit: 24 };
// Entries that still hold a place: a team may not enter the same tournament twice.
const HOLDS_PLACE = new Set(['pending', 'approved']);

function useRegistrations(teamId) {
  return useQuery({
    queryKey: qk.teams.registrations(teamId),
    queryFn: () => teamsApi.registrations(teamId),
  });
}

function OpenTournaments({ team }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: qk.tournaments.list(OPEN_PARAMS),
    queryFn: () => tournamentsApi.list(OPEN_PARAMS),
  });
  const registrations = useRegistrations(team.id);
  const register = useMutation({
    mutationFn: tournamentsApi.register,
    onSuccess: () => {
      notify.success(t('registration.submitted'));
      queryClient.invalidateQueries({ queryKey: qk.teams.registrations(team.id) });
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  const taken = new Set(
    (registrations.data ?? [])
      .filter((entry) => HOLDS_PLACE.has(entry.status))
      .map((entry) => entry.tournament.id),
  );
  const eligible = team.status === TEAM_STATUS.ACTIVE && team.squadCount >= KABADDI.minSquadSize;
  const items = query.data?.items ?? [];

  return (
    <View style={styles.stack}>
      {!eligible ? (
        <AppText variant="small" tone="warning" accessibilityLiveRegion="polite">
          {t('registration.notEligible', { min: KABADDI.minSquadSize })}
        </AppText>
      ) : null}
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {query.data && items.length === 0 ? <EmptyState title={t('registration.noneOpen')} /> : null}
      {items.map((tournament) => (
        <View key={tournament.id} style={styles.entry}>
          <TournamentCard tournament={tournament} />
          {taken.has(tournament.id) ? (
            <AppText weight="semibold" tone="success">
              {t('registration.alreadyEntered')}
            </AppText>
          ) : (
            <Button
              disabled={!eligible}
              loading={register.isPending && register.variables === tournament.id}
              onPress={() => register.mutate(tournament.id)}
            >
              {t('registration.registerTeam')}
            </Button>
          )}
        </View>
      ))}
    </View>
  );
}

function MyEntries({ team }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useRegistrations(team.id);
  const withdraw = useMutation({
    mutationFn: tournamentsApi.withdraw,
    onSuccess: () => {
      notify.success(t('registration.withdrawn'));
      queryClient.invalidateQueries({ queryKey: qk.teams.registrations(team.id) });
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  const entries = query.data ?? [];
  return (
    <View style={styles.stack}>
      {query.isPending ? <LoadingState /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {query.data && entries.length === 0 ? <EmptyState title={t('registration.none')} /> : null}
      {entries.map((entry) => (
        <Card key={entry.id}>
          <Pressable
            onPress={() => router.push(`/tournament/${entry.tournament.id}`)}
            accessibilityRole="link"
          >
            <AppText weight="semibold" numberOfLines={2}>
              {entry.tournament.name}
            </AppText>
          </Pressable>
          <AppText variant="small" tone="muted">
            {t('registration.registeredOn', { date: formatDate(entry.registeredAt) })}
          </AppText>
          {entry.rejectionReason ? (
            <AppText variant="small" tone="danger">
              {entry.rejectionReason}
            </AppText>
          ) : null}
          <StatusBadge status={entry.status} />
          {entry.status === 'pending' ? (
            <Button
              variant="secondary"
              loading={withdraw.isPending && withdraw.variables === entry.tournament.id}
              onPress={() => withdraw.mutate(entry.tournament.id)}
            >
              {t('registration.withdraw')}
            </Button>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

export default function CaptainTournaments() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('open');
  return (
    <CaptainScreen title={t('nav.tournaments')} subtitle={t('captain.tournamentsSubtitle')}>
      {(team) => (
        <View style={styles.stack}>
          <TabStrip
            label={t('nav.tournaments')}
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'open', label: t('registration.openTab') },
              { id: 'mine', label: t('registration.mineTab') },
            ]}
          />
          {tab === 'open' ? <OpenTournaments team={team} /> : <MyEntries team={team} />}
        </View>
      )}
    </CaptainScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.md },
  entry: { gap: SPACING.sm },
});
