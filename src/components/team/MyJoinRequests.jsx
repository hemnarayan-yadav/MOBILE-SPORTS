// The squads waiting for this player's answer — ported from
// frontend/src/components/team/MyJoinRequests.jsx.
//
// Nobody is put in a squad without agreeing to it, so this is where a captain's
// request is answered: on the home screen and on the /join screen the WhatsApp
// message leads to. It renders nothing while there is nothing waiting, so both
// can show it unconditionally.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { joinRequestsApi } from '../../api/joinRequests.api.js';
import { qk } from '../../api/queryKeys.js';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import { PLAYING_ROLES } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import { Card, Section } from '../common/Layout.jsx';
import TeamCrest from './TeamCrest.jsx';

export default function MyJoinRequests() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const query = useQuery({
    queryKey: qk.joinRequests.mine,
    queryFn: joinRequestsApi.mine,
    enabled: status === AUTH_STATUS.AUTHENTICATED,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.joinRequests.mine });
    queryClient.invalidateQueries({ queryKey: qk.teams.all });
  };
  const onError = (error) => notify.error(apiErrorText(t, error));

  const accept = useMutation({
    mutationFn: (request) => joinRequestsApi.accept(request.id),
    onSuccess: ({ team }) => {
      notify.success(t('joinRequest.accepted', { team: team?.name ?? '' }));
      refresh();
      if (team?.id) router.push(`/team/${team.id}`);
    },
    onError,
  });
  const reject = useMutation({
    mutationFn: (request) => joinRequestsApi.reject(request.id),
    onSuccess: () => {
      notify.success(t('joinRequest.rejected'));
      refresh();
    },
    onError,
  });
  const answering = accept.isPending || reject.isPending;

  const requests = query.data?.items ?? [];
  if (requests.length === 0) return null;

  return (
    <Section title={t('joinRequest.title')}>
      <AppText variant="small" tone="muted">
        {t('joinRequest.subtitle')}
      </AppText>
      {requests.map((request) => (
        <Card key={request.id}>
          <View style={styles.head}>
            <TeamCrest team={request.team} size="md" />
            <View style={styles.flex}>
              <AppText weight="semibold" numberOfLines={1}>
                {request.team?.name}
              </AppText>
              <AppText variant="small" tone="muted">
                {t('joinRequest.invitedBy', { captain: request.invitedBy ?? '' })}
              </AppText>
              <View style={styles.badges}>
                <Badge tone="brand">{t('joinRequest.jersey', { number: request.jerseyNumber })}</Badge>
                {PLAYING_ROLES.includes(request.playingRole) ? (
                  <Badge>{t(`playingRole.${request.playingRole}`)}</Badge>
                ) : null}
              </View>
              <AppText variant="small" tone="muted">
                {t('joinRequest.expires', { date: formatDate(request.expiresAt) })}
              </AppText>
            </View>
          </View>
          <View style={styles.actions}>
            <Button
              style={styles.flex}
              disabled={answering}
              loading={accept.isPending && accept.variables?.id === request.id}
              onPress={() => accept.mutate(request)}
            >
              {t('joinRequest.accept')}
            </Button>
            <Button
              variant="secondary"
              style={styles.flex}
              disabled={answering}
              loading={reject.isPending && reject.variables?.id === request.id}
              onPress={() => reject.mutate(request)}
            >
              {t('joinRequest.reject')}
            </Button>
          </View>
        </Card>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginVertical: SPACING.xs },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
});
