// Adapted from frontend/src/components/team/TeamCard.jsx, TeamHero.jsx and
// Squad.jsx (the public squad view).
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { IMAGE_WIDTH, cloudinaryImage } from '../../utils/cloudinary.js';
import { KABADDI, PLAYING_ROLES } from '../../utils/constants.js';
import AppText from '../common/AppText.jsx';
import Badge, { StatusBadge } from '../common/Badge.jsx';
import { Card } from '../common/Layout.jsx';
import { EmptyState } from '../common/States.jsx';
import { PlayerCard } from '../player/PlayerBits.jsx';
import TeamCrest from './TeamCrest.jsx';

export function TeamCard({ team }) {
  const { t } = useTranslation();
  const router = useRouter();
  const place = [team.homeGround, team.city].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={() => router.push(`/team/${team.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <Card style={styles.teamCard}>
        <TeamCrest team={team} size="md" />
        <View style={styles.flex}>
          <AppText variant="title" display numberOfLines={1}>
            {team.name}
          </AppText>
          {place ? (
            <AppText variant="small" tone="muted" numberOfLines={1}>
              {place}
            </AppText>
          ) : null}
          <AppText variant="small" tone="muted">
            {t('team.playersCount', { count: team.squadCount ?? 0 })}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

export function TeamHero({ team, actions }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const place = [team.homeGround, team.city].filter(Boolean).join(', ');
  return (
    <View style={[styles.hero, { backgroundColor: colors.ink }]}>
      {team.bannerUrl ? (
        <Image
          source={{ uri: cloudinaryImage(team.bannerUrl, { width: IMAGE_WIDTH.hero }) }}
          style={[StyleSheet.absoluteFill, styles.heroImage]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <TeamCrest team={team} size="xl" />
      <View style={styles.badges}>
        <Badge tone="ink">{team.shortName}</Badge>
        <StatusBadge status={team.status} />
      </View>
      <AppText variant="heading" tone="onInk" accessibilityRole="header">
        {team.name}
      </AppText>
      {place ? (
        <AppText variant="small" tone="onInk">
          {place}
        </AppText>
      ) : null}
      {team.foundedYear ? (
        <AppText variant="small" tone="onInk">
          {t('team.founded', { year: team.foundedYear })}
        </AppText>
      ) : null}
      {team.captain ? (
        <AppText variant="small" tone="onInk">
          {t('team.captainName', { name: team.captain.name })}
        </AppText>
      ) : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

function PlayingSevenStrip({ squad }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const seven = squad.filter((member) => member.isPlayingSeven);
  const slots = Array.from({ length: KABADDI.playersOnCourt }, (_, i) => seven[i] ?? null);
  return (
    <Card>
      <View style={styles.stripHead}>
        <AppText weight="bold">{t('squad.playingSeven')}</AppText>
        <AppText weight="semibold" tone="muted">
          {seven.length} / {KABADDI.playersOnCourt}
        </AppText>
      </View>
      <View style={styles.slots}>
        {slots.map((member, index) => (
          <View key={member?.player.id ?? `empty-${index}`} style={styles.slot}>
            <View
              style={[
                styles.slotCircle,
                member
                  ? { backgroundColor: colors.ink, borderColor: colors.brand }
                  : { borderColor: colors.border, borderStyle: 'dashed' },
              ]}
            >
              <AppText weight="bold" display tone={member ? 'onInk' : 'muted'}>
                {member ? member.jerseyNumber : '+'}
              </AppText>
            </View>
            <AppText variant="label" tone="muted" numberOfLines={1}>
              {member ? member.player.name.split(' ')[0] : ''}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

// The public squad, grouped by playing role.
export function SquadBoard({ squad }) {
  const { t } = useTranslation();
  if (squad.length === 0) {
    return <EmptyState title={t('squad.emptyTitle')} hint={t('squad.emptyPublic')} />;
  }
  return (
    <View style={styles.stack}>
      <PlayingSevenStrip squad={squad} />
      {PLAYING_ROLES.map((role) => {
        const members = squad.filter((member) => member.playingRole === role);
        if (members.length === 0) return null;
        return (
          <View key={role} style={styles.stack}>
            <AppText variant="label" tone="muted">
              {`${t(`playingRole.${role}Plural`)} (${members.length})`}
            </AppText>
            {members.map((member) => (
              <PlayerCard key={member.player.id} member={member} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: SPACING.sm },
  teamCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  hero: { borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.sm, overflow: 'hidden' },
  heroImage: { opacity: 0.35 },
  badges: { flexDirection: 'row', gap: SPACING.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  stripHead: { flexDirection: 'row', justifyContent: 'space-between' },
  slots: { flexDirection: 'row', gap: SPACING.xs },
  slot: { flex: 1, alignItems: 'center', gap: 2 },
  slotCircle: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
