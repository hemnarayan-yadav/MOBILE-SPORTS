// The captain's home — adapted from CaptainHome/CaptainOverview in
// frontend/src/pages/dashboard/captain/CaptainPages.jsx: the team, how ready it
// is, and the way into every other captain screen.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { matchesApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import { teamsApi } from '../../api/teams.api.js';
import Button from '../../components/common/Button.jsx';
import { Card, Section, StatTile, TileGrid } from '../../components/common/Layout.jsx';
import { EmptyState } from '../../components/common/States.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import CaptainScreen, { LockedNotice } from '../../components/team/CaptainScreen.jsx';
import { SquadReadiness } from '../../components/team/SquadBits.jsx';
import { TeamHero } from '../../components/team/TeamBits.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { SPACING } from '../../theme/tokens.js';
import { KABADDI, MATCH_STATUS } from '../../utils/constants.js';

const UPCOMING_LIMIT = 3;

function Overview({ team }) {
  const { t } = useTranslation();
  const router = useRouter();
  const registrations = useQuery({
    queryKey: qk.teams.registrations(team.id),
    queryFn: () => teamsApi.registrations(team.id),
  });
  const params = { team: team.id, status: MATCH_STATUS.UPCOMING, limit: UPCOMING_LIMIT };
  const upcoming = useQuery({
    queryKey: qk.matches.list(params),
    queryFn: () => matchesApi.list(params),
  });
  const sevenCount = team.squad.filter((member) => member.isPlayingSeven).length;
  const pending = registrations.data?.filter((entry) => entry.status === 'pending').length ?? 0;
  const matches = upcoming.data?.items ?? [];

  return (
    <View style={styles.stack}>
      <LockedNotice team={team} />
      <TeamHero
        team={team}
        actions={
          <Button variant="secondary" onPress={() => router.push(`/team/${team.id}`)}>
            {t('captain.publicPage')}
          </Button>
        }
      />
      <TileGrid>
        <StatTile
          label={t('captain.squad')}
          value={`${team.squadCount}/${KABADDI.maxTeamSquadSize}`}
        />
        <StatTile
          label={t('squad.playingSevenShort')}
          value={`${sevenCount}/${KABADDI.playersOnCourt}`}
        />
        <StatTile label={t('captain.pendingEntries')} value={pending} />
      </TileGrid>

      <SquadReadiness team={team} squad={team.squad} />

      <Card>
        <Button onPress={() => router.push('/captain/squad')}>{t('squad.title')}</Button>
        <Button variant="secondary" onPress={() => router.push('/captain/squad?view=seven')}>
          {t('squad.setPlayingSeven')}
        </Button>
        <Button variant="secondary" onPress={() => router.push('/captain/team')}>
          {t('captain.editTeam')}
        </Button>
        <Button variant="secondary" onPress={() => router.push('/captain/tournaments')}>
          {t('captain.findTournaments')}
        </Button>
        <Button variant="secondary" onPress={() => router.push('/captain/matches')}>
          {t('nav.teamMatches')}
        </Button>
      </Card>

      <Section title={t('captain.upcomingMatches')}>
        {matches.length === 0 ? (
          <EmptyState title={t('captain.noUpcoming')} />
        ) : (
          matches.map((match) => <MatchCard key={match.id} match={match} />)
        )}
      </Section>
    </View>
  );
}

export default function CaptainHome() {
  const { t } = useTranslation();
  const name = useAuthStore((s) => s.user?.name ?? '');
  return (
    <CaptainScreen title={t('dashboard.welcome', { name })} subtitle={t('captain.subtitle')}>
      {(team) => <Overview team={team} />}
    </CaptainScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.md },
});
