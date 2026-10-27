// Ported from frontend/src/pages/dashboard/captain/AddPlayer.jsx (which
// replaced AddByPhone.jsx when inviting was retired).
//
// Adding a player to the squad. Search first, by name or by mobile number: an
// account that already exists is added to the squad, so the same person is
// never registered twice. A matching name is no proof it is the same person,
// though, so adding a new member is always on offer alongside the results — it
// creates the account and the squad place together, and the API still refuses a
// second account for a number that already has one.
//
// Inviting a player over WhatsApp is retired — there is no link, no resend and
// no delivery state here any more. Invitations sent before the change can still
// be accepted by the player (app/join).
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { qk } from '../../api/queryKeys.js';
import { teamsApi } from '../../api/teams.api.js';
import { usersApi } from '../../api/users.api.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { notify } from '../../store/noticeStore.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import { joinPhone } from '../../utils/countries.js';
import { JERSEY_MAX_LENGTH, PLAYING_ROLES } from '../../utils/constants.js';
import { directPlayerSchema, toLocationPayload } from '../../utils/validation.js';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import Button from '../common/Button.jsx';
import { ErrorState, LoadingState } from '../common/States.jsx';
import PhoneField from '../common/PhoneField.jsx';
import SearchField from '../common/SearchField.jsx';
import SegmentedControl from '../common/SegmentedControl.jsx';
import StateDistrictFields from '../common/StateDistrictFields.jsx';
import TextField, { FieldMessages } from '../common/TextField.jsx';
import PlayerForm from '../player/PlayerForm.jsx';
import { EVENTS, track } from '../../lib/analytics.js';

// The API's own minimum for a search (users.validation.searchPlayerAccountsSchema).
const MIN_QUERY_LENGTH = 2;
const DIGITS_ONLY = /^[\d\s+\-()]+$/;
const INDIAN_MOBILE_DIGITS = 10;

// One account found by the search: the picture, the name and the jersey number
// the contract asks for, plus the masked number — the full one is never sent.
function ResultRow({ item, onPick }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const jersey = item.jerseyNumber === null ? null : `#${item.jerseyNumber}`;
  return (
    <Pressable
      onPress={() => onPick(item)}
      disabled={item.inSquad}
      accessibilityRole="button"
      accessibilityState={{ disabled: item.inSquad }}
      accessibilityLabel={
        item.jerseyNumber === null
          ? `${item.name} ${t('squad.noJersey')}`
          : `${item.name} ${t('squad.jerseyLine', { jersey: item.jerseyNumber })}`
      }
      style={[styles.row, { borderBottomColor: colors.border, opacity: item.inSquad ? 0.5 : 1 }]}
    >
      <Avatar src={item.avatarUrl} name={item.name} size="sm" />
      <View style={styles.flex}>
        <AppText weight="semibold" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="small" tone="muted">
          {item.phoneMasked ?? ''}
        </AppText>
      </View>
      {/* The number itself, not copy; a player without one shows a dash and
          says so in the row's accessibility label. */}
      <AppText display weight="bold" tone={jersey ? 'text' : 'muted'}>
        {jersey ?? '—'}
      </AppText>
      {item.inSquad ? (
        <AppText variant="small" tone="muted">
          {t('squad.alreadyInSquad')}
        </AppText>
      ) : null}
    </Pressable>
  );
}

// A player with no account yet. Name, number and jersey are required; the state
// and district are not. If the number turns out to have an account after all,
// the API attaches it instead of creating a second one and says so.
function DirectAddForm({ teamId, query, found, onDone }) {
  const { t } = useTranslation();
  // A ten-digit search carries over into the number; anything else into the
  // name, so the captain never types what they just searched for twice.
  const digits = query.replace(/\D/g, '');
  const looksLikeNumber = DIGITS_ONLY.test(query) && digits.length >= INDIAN_MOBILE_DIGITS;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(directPlayerSchema),
    defaultValues: {
      name: looksLikeNumber ? '' : query,
      phone: looksLikeNumber ? joinPhone('IN', digits.slice(-INDIAN_MOBILE_DIGITS)) : '',
      jerseyNumber: '',
      playingRole: 'raider',
      state: '',
      district: '',
    },
  });
  const add = useMutation({
    mutationFn: ({ state, district, ...values }) =>
      teamsApi.addDirectPlayer(teamId, {
        ...values,
        location: toLocationPayload({ state, district }),
      }),
    onSuccess: (member) => {
      // A captain's add asks the player first (`pending`): nobody is in the
      // squad until they accept it.
      const key = member.pending
        ? 'joinRequest.sent'
        : member.accountCreated
          ? 'squad.playerAdded'
          : 'squad.playerLinked';
      track(EVENTS.SQUAD_PLAYER_ADDED, { pending: Boolean(member.pending) });
      notify.success(t(key, { name: member.player.name }));
      onDone();
    },
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  // The two pickers are driven together: picking a state clears the district.
  const setLocation = ({ state, district }) => {
    setValue('state', state);
    setValue('district', district);
  };

  return (
    <View style={styles.stack}>
      <AppText variant="small" tone="muted" accessibilityLiveRegion="polite">
        {found ? t('squad.addNewMemberHint') : t('squad.noMatch', { query })}
      </AppText>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label={t('player.name')}
            autoCapitalize="words"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneField
            label={t('auth.phone')}
            hint={t('squad.directPhoneHint')}
            value={field.value}
            onChange={field.onChange}
            error={errors.phone}
          />
        )}
      />
      <Controller
        control={control}
        name="jerseyNumber"
        render={({ field }) => (
          <TextField
            label={t('player.jerseyNumber')}
            keyboardType="number-pad"
            maxLength={JERSEY_MAX_LENGTH}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.jerseyNumber}
          />
        )}
      />
      <View style={styles.role}>
        <AppText variant="label">{t('player.playingRole')}</AppText>
        <Controller
          control={control}
          name="playingRole"
          render={({ field }) => (
            <SegmentedControl
              label={t('player.playingRole')}
              value={field.value}
              onChange={field.onChange}
              options={PLAYING_ROLES.map((role) => ({
                value: role,
                label: t(`playingRole.${role}`),
              }))}
            />
          )}
        />
        <FieldMessages error={errors.playingRole} />
      </View>
      <StateDistrictFields
        state={watch('state')}
        district={watch('district')}
        onChange={setLocation}
        errors={{ state: errors.state, district: errors.district }}
      />
      <Button onPress={handleSubmit((values) => add.mutate(values))} loading={add.isPending}>
        {t('squad.addPlayer')}
      </Button>
    </View>
  );
}

// The jersey number and role the picked account will play in. The squad place
// is created from the account's id, never from a number typed again.
function AddPickedAccount({ teamId, picked, onBack, onDone }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const add = useMutation({
    mutationFn: (values) => teamsApi.addExistingUser(teamId, { userId: picked.id, ...values }),
    onSuccess: (member) => {
      track(EVENTS.SQUAD_PLAYER_ADDED, { pending: Boolean(member.pending) });
      notify.success(
        t(member.pending ? 'joinRequest.sent' : 'squad.playerAdded', { name: member.player.name }),
      );
      onDone();
    },
    onError: (error) => notify.error(apiErrorText(t, error)),
  });

  return (
    <View style={styles.stack}>
      <View
        style={[styles.account, { backgroundColor: colors.surface2, borderColor: colors.border }]}
      >
        <Avatar src={picked.avatarUrl} name={picked.name} size="md" />
        <View style={styles.flex}>
          <AppText weight="semibold" numberOfLines={1}>
            {picked.name}
          </AppText>
          <AppText variant="small" tone="muted">
            {t('squad.hasAccount')}
          </AppText>
        </View>
      </View>
      <PlayerForm
        mode="membership"
        defaultValues={{
          jerseyNumber:
            picked.jerseyNumber === null || picked.jerseyNumber === undefined
              ? ''
              : String(picked.jerseyNumber),
          playingRole: 'raider',
        }}
        onSubmit={(values) => add.mutate(values)}
        submitting={add.isPending}
        submitLabel={t('squad.addToSquad')}
      />
      <Button variant="ghost" disabled={add.isPending} onPress={onBack}>
        {t('squad.searchAgain')}
      </Button>
    </View>
  );
}

export default function AddByPhone({ teamId, onDone }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  // Asked for explicitly when the search did find somebody. Typing again puts
  // the choice back, so the new results are seen before the form reopens.
  const [addingNew, setAddingNew] = useState(false);
  const trimmed = useDebouncedValue(query.trim());
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;

  const search = useQuery({
    queryKey: qk.users.search({ query: trimmed, teamId }),
    queryFn: () => usersApi.search({ query: trimmed, teamId }),
    enabled,
  });

  if (picked) {
    return (
      <AddPickedAccount
        teamId={teamId}
        picked={picked}
        onBack={() => setPicked(null)}
        onDone={onDone}
      />
    );
  }

  const items = search.data?.items ?? [];
  const searched = enabled && search.isSuccess;
  const nothingFound = searched && items.length === 0;
  // The form opens itself when nothing matched, and on request when something
  // did; either way only after a finished search.
  const showNewMember = nothingFound || (searched && addingNew);
  // Nothing found needs no hint: the direct-add form says so itself.
  const hint = !trimmed
    ? 'squad.searchHint'
    : !enabled
      ? 'validation.searchMin'
      : items.length > 0
        ? 'squad.searchResults'
        : null;

  return (
    <View style={styles.stack}>
      <SearchField
        value={query}
        onChange={(value) => {
          setQuery(value);
          setAddingNew(false);
        }}
        placeholder={t('squad.searchLabel')}
      />
      {hint ? (
        <AppText variant="small" tone="muted">
          {t(hint)}
        </AppText>
      ) : null}
      {enabled && search.isPending ? <LoadingState /> : null}
      {search.isError ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      ) : null}
      {items.map((item) => (
        <ResultRow key={item.id} item={item} onPick={setPicked} />
      ))}
      {searched && !showNewMember ? (
        <Button variant="secondary" onPress={() => setAddingNew(true)}>
          {t('squad.addNewMember')}
        </Button>
      ) : null}
      {showNewMember ? (
        <DirectAddForm teamId={teamId} query={trimmed} found={items.length > 0} onDone={onDone} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.md },
  flex: { flex: 1 },
  role: { gap: SPACING.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: MIN_TOUCH,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: RADII.xl,
  },
});
