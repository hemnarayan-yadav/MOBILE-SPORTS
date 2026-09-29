// The captain's squad pieces, adapted from frontend/src/components/team/Squad.jsx
// (SquadReadiness, the playing-seven strip) and the rows and picker inside
// frontend/src/pages/dashboard/captain/SquadManagement.jsx.
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { KABADDI } from '../../utils/constants.js';
import AppText from '../common/AppText.jsx';
import Avatar from '../common/Avatar.jsx';
import Badge from '../common/Badge.jsx';
import { Card } from '../common/Layout.jsx';
import { PlayingRoleBadge } from '../player/PlayerBits.jsx';

// How ready the team is to play: the four things a captain has to finish.
export function SquadReadiness({ team, squad }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const sevenCount = squad.filter((member) => member.isPlayingSeven).length;
  const checks = [
    {
      key: 'squadSize',
      done: squad.length >= KABADDI.minSquadSize,
      value: `${squad.length}/${KABADDI.minSquadSize}`,
    },
    {
      key: 'playingSeven',
      done: sevenCount === KABADDI.playersOnCourt,
      value: `${sevenCount}/${KABADDI.playersOnCourt}`,
    },
    { key: 'logo', done: Boolean(team.logoUrl) },
    { key: 'homeGround', done: Boolean(team.homeGround) },
  ];
  const doneCount = checks.filter((check) => check.done).length;

  return (
    <Card>
      <View style={styles.row}>
        <AppText weight="bold" accessibilityRole="header" style={styles.flex}>
          {t('squad.readiness')}
        </AppText>
        <AppText weight="semibold" tone="muted">
          {doneCount}/{checks.length}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surface2 }]}>
        <View
          style={[
            styles.trackFill,
            { backgroundColor: colors.success, width: `${(doneCount / checks.length) * 100}%` },
          ]}
        />
      </View>
      {checks.map((check) => (
        <View key={check.key} style={styles.row}>
          {/* The tick is not the only signal: the label says what is done. */}
          <AppText tone={check.done ? 'success' : 'muted'}>{check.done ? '✓' : '○'}</AppText>
          <AppText style={styles.flex}>{t(`squad.check.${check.key}`)}</AppText>
          <AppText tone="muted">
            {check.value ?? (check.done ? t('common.done') : t('common.missing'))}
          </AppText>
        </View>
      ))}
    </Card>
  );
}

// One squad member in the captain's list, with the button that opens the
// actions sheet for them.
export function SquadRow({ member, invited, onOpenActions }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { player, jerseyNumber, playingRole, isPlayingSeven } = member;
  return (
    <View style={[styles.memberRow, { borderBottomColor: colors.border }]}>
      <AppText display weight="bold" variant="title" style={styles.jersey}>
        {jerseyNumber}
      </AppText>
      <Avatar src={player.photoUrl} name={player.name} size="sm" />
      <View style={styles.flex}>
        <AppText weight="semibold" numberOfLines={1}>
          {player.name}
        </AppText>
        <View style={styles.badges}>
          <PlayingRoleBadge role={playingRole} />
          {isPlayingSeven ? (
            <AppText variant="label" tone="brandStrong">
              {`★ ${t('squad.playingSevenShort')}`}
            </AppText>
          ) : null}
          {invited ? <Badge tone="info">{t('teamInvite.invitedTag')}</Badge> : null}
        </View>
      </View>
      <Pressable
        onPress={onOpenActions}
        accessibilityRole="button"
        accessibilityLabel={t('squad.playerActions', { name: player.name })}
        style={styles.more}
      >
        <AppText weight="bold" tone="muted">
          ⋯
        </AppText>
      </Pressable>
    </View>
  );
}

// Tap a player to put them in or out of the seven. Selection is local until it
// is saved by the screen.
export function PlayingSevenPicker({ squad, selected, onToggle }) {
  const { colors } = useTheme();
  return (
    <View style={styles.picker}>
      {squad.map((member) => {
        const active = selected.includes(member.player.id);
        return (
          <Pressable
            key={member.player.id}
            onPress={() => onToggle(member.player.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${member.jerseyNumber} ${member.player.name}`}
            style={({ pressed }) => [
              styles.pick,
              {
                borderColor: active ? colors.brand : colors.border,
                backgroundColor: active ? colors.brandSoft : colors.surface,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.pickJersey,
                { backgroundColor: active ? colors.brandBtn : colors.surface2 },
              ]}
            >
              <AppText display weight="bold" tone={active ? 'onBrand' : 'text'}>
                {member.jerseyNumber}
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText weight="semibold" numberOfLines={1}>
                {member.player.name}
              </AppText>
              <PlayingRoleBadge role={member.playingRole} />
            </View>
            {/* Never colour alone: the chosen ones are ticked as well. */}
            <AppText tone={active ? 'brandStrong' : 'muted'}>{active ? '✓' : ''}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1 },
  track: { height: 6, borderRadius: RADII.full, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: RADII.full },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  jersey: { minWidth: 32, textAlign: 'center' },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.xs },
  more: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: { gap: SPACING.sm },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: MIN_TOUCH + 12,
    padding: SPACING.sm,
    borderWidth: 2,
    borderRadius: RADII.xl,
  },
  // Grows rather than clips when the phone's text size is turned up.
  pickJersey: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
