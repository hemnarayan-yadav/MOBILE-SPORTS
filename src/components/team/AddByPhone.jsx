// Ported from frontend/src/pages/dashboard/captain/AddByPhone.jsx.
//
// Adds a player by phone number. The backend decides what the number is: an
// existing account (added and linked directly), no account (the player joins
// the squad and gets a WhatsApp invitation), or an account that cannot be
// added. The screen never builds links or tokens.
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { invitationsApi } from '../../api/invitations.api.js';
import { teamsApi } from '../../api/teams.api.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { formatPhone } from '../../utils/countries.js';
import { phoneLookupSchema } from '../../utils/validation.js';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import Button from '../common/Button.jsx';
import PhoneField from '../common/PhoneField.jsx';
import PlayerForm from '../player/PlayerForm.jsx';

// The API's answer to a phone lookup (PHONE_LOOKUP_MATCH on the backend).
const MATCH = Object.freeze({ USER: 'user', NONE: 'none', UNAVAILABLE: 'unavailable' });
const NEW_MEMBER = Object.freeze({ name: '', jerseyNumber: '', playingRole: 'raider' });

function LookupForm({ teamId, onFound }) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(phoneLookupSchema), defaultValues: { phone: '' } });
  const lookup = useMutation({
    mutationFn: (phone) => teamsApi.lookupPhone(teamId, phone),
    onSuccess: (result, phone) => onFound({ phone, ...result }),
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  return (
    <View style={styles.stack}>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneField
            label={t('auth.phone')}
            hint={t('teamInvite.phoneHint')}
            value={field.value}
            onChange={field.onChange}
            error={errors.phone}
          />
        )}
      />
      <Button
        onPress={handleSubmit(({ phone }) => lookup.mutate(phone))}
        loading={lookup.isPending}
      >
        {t('teamInvite.continue')}
      </Button>
    </View>
  );
}

export default function AddByPhone({ teamId, onDone }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [found, setFound] = useState(null);
  const onError = (error) => notify.error(t(apiErrorKey(error)));

  const addExisting = useMutation({
    mutationFn: (values) => teamsApi.addExistingUser(teamId, { phone: found.phone, ...values }),
    onSuccess: (member) => {
      notify.success(t('squad.playerAdded', { name: member.player.name }));
      onDone();
    },
    onError,
  });
  const invite = useMutation({
    mutationFn: (values) => invitationsApi.create(teamId, { phone: found.phone, ...values }),
    onSuccess: (invitation) => {
      notify.success(t('teamInvite.sent', { name: invitation.player?.name }));
      onDone();
    },
    onError,
  });

  if (!found) return <LookupForm teamId={teamId} onFound={setFound} />;

  const busy = addExisting.isPending || invite.isPending;
  const back = (
    <Button variant="ghost" disabled={busy} onPress={() => setFound(null)}>
      {t('teamInvite.changeNumber')}
    </Button>
  );

  if (found.match === MATCH.USER) {
    return (
      <View style={styles.stack}>
        <View
          style={[styles.account, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        >
          <Avatar src={found.user.avatarUrl} name={found.user.name} size="md" />
          <View style={styles.flex}>
            <AppText weight="semibold" numberOfLines={1}>
              {found.user.name}
            </AppText>
            <AppText variant="small" tone="muted">
              {t('teamInvite.hasAccount')}
            </AppText>
          </View>
        </View>
        {found.inSquad ? (
          <AppText accessibilityLiveRegion="polite">
            {t('teamInvite.alreadyInSquad', { name: found.user.name })}
          </AppText>
        ) : (
          <>
            <AppText variant="small" tone="muted">
              {t('teamInvite.addExistingHint')}
            </AppText>
            <PlayerForm
              mode="membership"
              onSubmit={(values) => addExisting.mutate(values)}
              submitting={addExisting.isPending}
              submitLabel={t('teamInvite.addToSquad')}
            />
          </>
        )}
        {back}
      </View>
    );
  }

  if (found.match === MATCH.NONE) {
    return (
      <View style={styles.stack}>
        <AppText variant="small" tone="muted">
          {t('teamInvite.noAccount', { phone: formatPhone(found.phone) })}
        </AppText>
        <PlayerForm
          mode="invite"
          defaultValues={NEW_MEMBER}
          onSubmit={(values) => invite.mutate(values)}
          submitting={invite.isPending}
          submitLabel={t('teamInvite.send')}
        />
        {back}
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <AppText accessibilityLiveRegion="polite">
        {`${formatPhone(found.phone)} ${t('teamInvite.unavailable')}`}
      </AppText>
      {back}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.md },
  flex: { flex: 1 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: 16,
  },
});
