// The squad desk — adapted from
// frontend/src/pages/dashboard/captain/SquadManagement.jsx: the squad list with
// per-player actions, adding by phone or by hand, the playing seven, and the
// open invitations underneath.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { qk } from '../../api/queryKeys.js';
import { playersApi, teamsApi } from '../../api/teams.api.js';
import AppText from '../../components/common/AppText.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Button from '../../components/common/Button.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { Card } from '../../components/common/Layout.jsx';
import SegmentedControl from '../../components/common/SegmentedControl.jsx';
import Sheet from '../../components/common/Sheet.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import PlayerForm, { toPlayerFormValues } from '../../components/player/PlayerForm.jsx';
import AddByPhone from '../../components/team/AddByPhone.jsx';
import CaptainScreen from '../../components/team/CaptainScreen.jsx';
import { PlayingSevenPicker, SquadReadiness, SquadRow } from '../../components/team/SquadBits.jsx';
import TeamInvitations from '../../components/team/TeamInvitations.jsx';
import { openInvitations, useTeamInvitations } from '../../hooks/useTeamInvitations.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { KABADDI } from '../../utils/constants.js';
import { blankToNull } from '../../utils/validation.js';

const OPTIONAL_PROFILE_FIELDS = ['photoUrl', 'dob', 'hometown', 'bio'];
const toPayload = (values) => blankToNull(values, OPTIONAL_PROFILE_FIELDS);

// Choosing the seven that start. Saved in one call, so a half-made change is
// never sent.
function PlayingSeven({ team, onSaved }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(() =>
    team.squad.filter((member) => member.isPlayingSeven).map((member) => member.player.id),
  );
  const save = useMutation({
    mutationFn: () => teamsApi.setPlayingSeven(team.id, selected),
    onSuccess: (squad) => {
      onSaved(squad);
      notify.success(t('squad.playingSevenSaved'));
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  const toggle = (playerId) =>
    setSelected((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= KABADDI.playersOnCourt) {
        notify.info(t('squad.playingSevenFull'));
        return current;
      }
      return [...current, playerId];
    });

  if (team.squad.length === 0) {
    return <EmptyState title={t('squad.emptyTitle')} hint={t('squad.emptyCaptain')} />;
  }
  return (
    <View style={styles.stack}>
      <AppText variant="small" tone="muted">
        {t('squad.playingSevenHint')}
      </AppText>
      <PlayingSevenPicker squad={team.squad} selected={selected} onToggle={toggle} />
      <Button loading={save.isPending} onPress={() => save.mutate()}>
        {t('squad.savePlayingSeven', { count: selected.length, max: KABADDI.playersOnCourt })}
      </Button>
    </View>
  );
}

// Editing the person behind the squad slot (name, photo, details), loaded on
// demand because the squad list does not carry the whole profile.
function EditProfileSheet({ playerId, onClose, onSaved }) {
  const { t } = useTranslation();
  const player = useQuery({
    queryKey: qk.players.detail(playerId),
    queryFn: () => playersApi.get(playerId),
    enabled: Boolean(playerId),
  });
  const save = useMutation({
    mutationFn: (values) => playersApi.update(playerId, toPayload(values)),
    onSuccess: () => {
      notify.success(t('player.saved'));
      onSaved();
      onClose();
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  return (
    <Sheet open={Boolean(playerId)} onClose={onClose} title={t('player.editProfile')}>
      {player.isPending ? <LoadingState /> : null}
      {player.isError ? <ErrorState error={player.error} onRetry={() => player.refetch()} /> : null}
      {player.data ? (
        <PlayerForm
          mode="profile"
          defaultValues={toPlayerFormValues(player.data)}
          onSubmit={(values) => save.mutate(values)}
          submitting={save.isPending}
          submitLabel={t('common.saveChanges')}
        />
      ) : null}
    </Sheet>
  );
}

function Squad({ team, view, onView }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const teamKey = qk.teams.detail(team.id);
  const refreshTeam = () => queryClient.invalidateQueries({ queryKey: teamKey });
  const onError = (error) => notify.error(t(apiErrorKey(error)));

  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState('phone');
  const [actionsFor, setActionsFor] = useState(null);
  const [editingMembership, setEditingMembership] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [releasing, setReleasing] = useState(null);

  const invitations = useTeamInvitations(team.id, { enabled: view === 'squad' });
  const invitedPlayerIds = new Set(
    openInvitations(invitations.data).map((invitation) => invitation.player?.id),
  );

  const add = useMutation({
    mutationFn: (values) => teamsApi.addPlayer(team.id, toPayload(values)),
    onSuccess: (member) => {
      notify.success(t('squad.playerAdded', { name: member.player.name }));
      setAdding(false);
      refreshTeam();
    },
    onError,
  });
  const updateMember = useMutation({
    mutationFn: ({ playerId, values }) => teamsApi.updateMember(team.id, playerId, values),
    onSuccess: () => {
      notify.success(t('squad.memberSaved'));
      setEditingMembership(null);
      refreshTeam();
    },
    onError,
  });
  const release = useMutation({
    mutationFn: (playerId) => teamsApi.releasePlayer(team.id, playerId),
    onSuccess: () => {
      notify.success(t('squad.playerReleased'));
      setReleasing(null);
      refreshTeam();
    },
    onError,
  });

  const full = team.squad.length >= KABADDI.maxTeamSquadSize;

  return (
    <View style={styles.stack}>
      <SegmentedControl
        label={t('squad.title')}
        value={view}
        onChange={onView}
        options={[
          { value: 'squad', label: t('squad.viewSquad') },
          { value: 'seven', label: t('squad.playingSeven') },
        ]}
      />

      {view === 'seven' ? (
        <PlayingSeven
          key={team.squad.map((member) => member.player.id).join()}
          team={team}
          onSaved={(squad) =>
            queryClient.setQueryData(teamKey, (current) => ({ ...current, squad }))
          }
        />
      ) : (
        <>
          <SquadReadiness team={team} squad={team.squad} />
          <Button disabled={full} onPress={() => setAdding(true)}>
            {full ? t('squad.full') : t('squad.addPlayer')}
          </Button>
          {team.squad.length === 0 ? (
            <EmptyState title={t('squad.emptyTitle')} hint={t('squad.emptyCaptain')} />
          ) : (
            <Card>
              {team.squad.map((member) => (
                <SquadRow
                  key={member.player.id}
                  member={member}
                  invited={invitedPlayerIds.has(member.player.id)}
                  onOpenActions={() => setActionsFor(member)}
                />
              ))}
            </Card>
          )}
          <TeamInvitations teamId={team.id} query={invitations} onSquadChanged={refreshTeam} />
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title={t('squad.addPlayer')}>
        {adding ? (
          <View style={styles.stack}>
            <SegmentedControl
              label={t('squad.addPlayer')}
              value={addMode}
              onChange={setAddMode}
              options={[
                { value: 'phone', label: t('teamInvite.byPhone') },
                { value: 'manual', label: t('teamInvite.withoutPhone') },
              ]}
            />
            {addMode === 'phone' ? (
              <AddByPhone
                teamId={team.id}
                onDone={() => {
                  setAdding(false);
                  refreshTeam();
                  queryClient.invalidateQueries({ queryKey: qk.invitations.team(team.id) });
                }}
              />
            ) : (
              <PlayerForm
                mode="add"
                onSubmit={(values) => add.mutate(values)}
                submitting={add.isPending}
                submitLabel={t('squad.addPlayer')}
              />
            )}
          </View>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(actionsFor)}
        onClose={() => setActionsFor(null)}
        title={actionsFor?.player.name}
      >
        {actionsFor ? (
          <View style={styles.stack}>
            <View style={styles.playerHead}>
              <Avatar src={actionsFor.player.photoUrl} name={actionsFor.player.name} />
              <AppText tone="muted">#{actionsFor.jerseyNumber}</AppText>
            </View>
            <Button
              variant="secondary"
              onPress={() => {
                setEditingProfileId(actionsFor.player.id);
                setActionsFor(null);
              }}
            >
              {t('player.editProfile')}
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                setEditingMembership(actionsFor);
                setActionsFor(null);
              }}
            >
              {t('squad.editJerseyRole')}
            </Button>
            <Button
              variant="danger"
              onPress={() => {
                setReleasing(actionsFor);
                setActionsFor(null);
              }}
            >
              {t('squad.release')}
            </Button>
          </View>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(editingMembership)}
        onClose={() => setEditingMembership(null)}
        title={t('squad.editJerseyRole')}
      >
        {editingMembership ? (
          <PlayerForm
            mode="membership"
            defaultValues={{
              jerseyNumber: String(editingMembership.jerseyNumber ?? ''),
              playingRole: editingMembership.playingRole,
            }}
            onSubmit={(values) =>
              updateMember.mutate({ playerId: editingMembership.player.id, values })
            }
            submitting={updateMember.isPending}
            submitLabel={t('common.saveChanges')}
          />
        ) : null}
      </Sheet>

      <EditProfileSheet
        playerId={editingProfileId}
        onClose={() => setEditingProfileId(null)}
        onSaved={refreshTeam}
      />

      <ConfirmDialog
        open={Boolean(releasing)}
        title={t('squad.release')}
        message={t('squad.releaseConfirm', { name: releasing?.player.name })}
        confirmLabel={t('squad.release')}
        loading={release.isPending}
        onCancel={() => setReleasing(null)}
        onConfirm={() => release.mutate(releasing.player.id)}
      />
    </View>
  );
}

export default function SquadManagement() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const [view, setView] = useState(params.view === 'seven' ? 'seven' : 'squad');

  return (
    <CaptainScreen title={t('squad.title')}>
      {(team) => (
        <>
          <AppText tone="muted">
            {t('squad.countLine', {
              count: team.squad.length,
              max: KABADDI.maxTeamSquadSize,
            })}
          </AppText>
          <Squad team={team} view={view} onView={setView} />
        </>
      )}
    </CaptainScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.md },
  playerHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
});
