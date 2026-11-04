// Adding a player to the squad. Two paths, picked by a tab at the top:
//
//   Direct: the captain fills the player's details (name, WhatsApp number,
//           jersey, role) and submits. Once the number is a complete Indian
//           mobile, the component looks it up on KhelScore behind the scenes;
//           if an account already uses it, a small sheet shows that account's
//           profile and asks whether to attach it to the squad instead of
//           creating a second one.
//
//   Search: the captain searches by name or number (the previous flow).
//
// On both paths the server does the final dedupe: an `addDirectPlayer` call
// with a number that turns out to have an account attaches it rather than
// creating a duplicate, and the answer tells the component which happened.
//
// Inviting a player over WhatsApp is retired — there is no link, no resend and
// no delivery state here any more. Invitations sent before the change can
// still be accepted by the player (app/join).
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
import { joinPhone, splitPhone } from '../../utils/countries.js';
import { JERSEY_MAX_LENGTH, PLAYING_ROLES } from '../../utils/constants.js';
import { directPlayerSchema, toLocationPayload } from '../../utils/validation.js';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import Button from '../common/Button.jsx';
import { ErrorState, LoadingState } from '../common/States.jsx';
import PhoneField from '../common/PhoneField.jsx';
import SearchField from '../common/SearchField.jsx';
import SegmentedControl from '../common/SegmentedControl.jsx';
import Sheet from '../common/Sheet.jsx';
import StateDistrictFields from '../common/StateDistrictFields.jsx';
import TextField, { FieldMessages } from '../common/TextField.jsx';
import PlayerForm from '../player/PlayerForm.jsx';
import { EVENTS, track } from '../../lib/analytics.js';

// The API's own minimum for a search (users.validation.searchPlayerAccountsSchema).
const MIN_QUERY_LENGTH = 2;
const DIGITS_ONLY = /^[\d\s+\-()]+$/;
const INDIAN_MOBILE_DIGITS = 10;

const MODES = Object.freeze({ DIRECT: 'direct', SEARCH: 'search' });

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

// The sheet shown when the typed number already belongs to a KhelScore
// account. The captain either accepts the match (the squad place is created
// from that account, not from a second one) or rejects it and continues with
// the direct-add they already filled.
function ExistingAccountSheet({ match, onUseExisting, onReject }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Sheet open onClose={onReject} title={t('app.squadExistingTitle')}>
      <View style={styles.stack}>
        <AppText tone="muted">{t('app.squadExistingBody')}</AppText>
        <View
          style={[styles.account, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        >
          <Avatar src={match.avatarUrl} name={match.name} size="md" />
          <View style={styles.flex}>
            <AppText weight="semibold" numberOfLines={1}>
              {match.name}
            </AppText>
            {match.phoneMasked ? (
              <AppText variant="small" tone="muted">
                {match.phoneMasked}
              </AppText>
            ) : null}
            {match.inSquad ? (
              <AppText variant="small" tone="warning">
                {t('squad.alreadyInSquad')}
              </AppText>
            ) : null}
          </View>
        </View>
        <Button disabled={match.inSquad} onPress={onUseExisting}>
          {t('app.squadUseExistingProfile')}
        </Button>
        <Button variant="ghost" onPress={onReject}>
          {t('app.squadNotThisPerson')}
        </Button>
      </View>
    </Sheet>
  );
}

// Direct add: name, WhatsApp number, jersey, role (+ optional state/district).
// Debounces a lookup on the number so a 10-digit entry asks the server whether
// it is already in use; if so, the sheet above offers the match. Accepting
// the match bubbles up through `onUseExisting`, so the parent can swap this
// form for the "add known account" view with the jersey + role carried over.
function DirectAddForm({ teamId, initialQuery, onDone, onUseExisting }) {
  const { t } = useTranslation();
  const digits = initialQuery.replace(/\D/g, '');
  const looksLikeNumber = DIGITS_ONLY.test(initialQuery) && digits.length >= INDIAN_MOBILE_DIGITS;
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(directPlayerSchema),
    defaultValues: {
      name: looksLikeNumber ? '' : initialQuery,
      phone: looksLikeNumber ? joinPhone('IN', digits.slice(-INDIAN_MOBILE_DIGITS)) : '',
      jerseyNumber: '',
      playingRole: 'raider',
      state: '',
      district: '',
    },
  });

  // Behind-the-scenes dedupe lookup once the number is complete. The sheet is
  // shown only after the captain has stopped typing (debounced) and the
  // captain has not already dismissed it for this number.
  const phoneValue = watch('phone');
  const phoneDigits = splitPhone(phoneValue ?? '').national ?? '';
  const phoneReady = phoneDigits.replace(/\D/g, '').length === INDIAN_MOBILE_DIGITS;
  const debouncedPhone = useDebouncedValue(phoneReady ? phoneValue : '');
  const [rejectedNumber, setRejectedNumber] = useState(null);

  const lookup = useQuery({
    queryKey: qk.users.search({ query: debouncedPhone, teamId }),
    queryFn: () => usersApi.search({ query: debouncedPhone, teamId }),
    enabled: Boolean(debouncedPhone) && debouncedPhone !== rejectedNumber,
  });
  const match = lookup.data?.items?.[0] ?? null;

  // A new number clears a previous dismissal so the lookup can show its match.
  useEffect(() => {
    if (rejectedNumber && phoneValue !== rejectedNumber) setRejectedNumber(null);
  }, [phoneValue, rejectedNumber]);

  const add = useMutation({
    mutationFn: ({ state, district, ...values }) =>
      teamsApi.addDirectPlayer(teamId, {
        ...values,
        location: toLocationPayload({ state, district }),
      }),
    onSuccess: (member) => {
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

  const setLocation = ({ state, district }) => {
    setValue('state', state);
    setValue('district', district);
  };

  const useExistingMatch = () => {
    if (!match) return;
    // The jersey and role the captain has already filled carry over.
    onUseExisting({
      picked: match,
      jerseyNumber: watch('jerseyNumber'),
      playingRole: watch('playingRole'),
    });
  };

  return (
    <View style={styles.stack}>
      <AppText variant="small" tone="muted">
        {t('app.squadDirectAddHint')}
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
      {match ? (
        <ExistingAccountSheet
          match={match}
          onUseExisting={useExistingMatch}
          onReject={() => setRejectedNumber(phoneValue)}
        />
      ) : null}
    </View>
  );
}

// The jersey number and role the picked account will play in. The squad place
// is created from the account's id, never from a number typed again.
function AddPickedAccount({ teamId, picked, prefill, onBack, onDone }) {
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

  const defaultJersey =
    prefill?.jerseyNumber && String(prefill.jerseyNumber).trim() !== ''
      ? String(prefill.jerseyNumber)
      : picked.jerseyNumber === null || picked.jerseyNumber === undefined
        ? ''
        : String(picked.jerseyNumber);

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
          jerseyNumber: defaultJersey,
          playingRole: prefill?.playingRole ?? 'raider',
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

// Search-by-name path (the previous flow): type, see matches, tap one to add.
function SearchByName({ teamId, onPickExisting }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const trimmed = useDebouncedValue(query.trim());
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;

  const search = useQuery({
    queryKey: qk.users.search({ query: trimmed, teamId }),
    queryFn: () => usersApi.search({ query: trimmed, teamId }),
    enabled,
  });

  const items = search.data?.items ?? [];
  const hint = !trimmed
    ? 'squad.searchHint'
    : !enabled
      ? 'validation.searchMin'
      : items.length > 0
        ? 'squad.searchResults'
        : 'squad.noMatch';

  return (
    <View style={styles.stack}>
      <SearchField value={query} onChange={setQuery} placeholder={t('squad.searchLabel')} />
      {hint ? (
        <AppText variant="small" tone="muted">
          {t(hint, { query: trimmed })}
        </AppText>
      ) : null}
      {enabled && search.isPending ? <LoadingState /> : null}
      {search.isError ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      ) : null}
      {items.map((item) => (
        <ResultRow key={item.id} item={item} onPick={onPickExisting} />
      ))}
    </View>
  );
}

export default function AddByPhone({ teamId, onDone }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(MODES.DIRECT);
  // Picked from the dedupe sheet (direct mode) or the search list (search mode).
  const [picked, setPicked] = useState(null);
  const [pickedPrefill, setPickedPrefill] = useState(null);

  const pickExisting = ({ picked: p, jerseyNumber, playingRole }) => {
    setPicked(p);
    setPickedPrefill({ jerseyNumber, playingRole });
  };

  if (picked) {
    return (
      <AddPickedAccount
        teamId={teamId}
        picked={picked}
        prefill={pickedPrefill}
        onBack={() => {
          setPicked(null);
          setPickedPrefill(null);
        }}
        onDone={onDone}
      />
    );
  }

  return (
    <View style={styles.stack}>
      <SegmentedControl
        label={t('app.squadAddModeLabel')}
        value={mode}
        onChange={setMode}
        options={[
          { value: MODES.DIRECT, label: t('app.squadAddModeDirect') },
          { value: MODES.SEARCH, label: t('app.squadAddModeSearch') },
        ]}
      />
      {mode === MODES.DIRECT ? (
        <DirectAddForm
          teamId={teamId}
          initialQuery=""
          onDone={onDone}
          onUseExisting={pickExisting}
        />
      ) : (
        <SearchByName teamId={teamId} onPickExisting={setPicked} />
      )}
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
