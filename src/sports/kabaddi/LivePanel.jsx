// Kabaddi's part of the live scoreboard: who is on court, who raids next (and
// whether it is do-or-die), and the raid clock. Adapted from CourtStrip in
// frontend/src/components/match/MatchBits.jsx and ViewerRaidClock in
// frontend/src/components/live/RaidClock.jsx.
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppText from '../../components/common/AppText.jsx';
import { useNow } from '../../hooks/useNow.js';
import { serverNow } from '../../lib/serverClock.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { KABADDI } from '../../utils/constants.js';
import { clockRemainingSeconds } from '../../utils/format.js';

const LOW_SECONDS = 5;
const RAID_TICK_MS = 250;
const DOT = 10;

// Seven slots per side: filled while on court, hollow while out.
function CourtStrip({ team, onCourt, out, align }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const slots = Math.max(onCourt + out, KABADDI.playersOnCourt);
  return (
    <View
      style={[styles.strip, align === 'right' && styles.right]}
      accessible
      accessibilityLabel={t('live.onCourtCount', { team, count: onCourt })}
    >
      {Array.from({ length: slots }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < onCourt
              ? { backgroundColor: colors.brand }
              : { borderWidth: 1, borderColor: colors.onInk, opacity: 0.4 },
          ]}
        />
      ))}
    </View>
  );
}

// Seconds left on the raid, ticking in server time inside this component only.
function RaidClock({ currentRaid, raidSeconds, directory }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const now = useNow(RAID_TICK_MS, Boolean(currentRaid?.runningSince));
  if (!currentRaid) return null;
  const remaining = clockRemainingSeconds(currentRaid, raidSeconds, serverNow(now));
  const ratio = raidSeconds > 0 ? remaining / raidSeconds : 0;
  const low = remaining <= LOW_SECONDS;
  return (
    <View style={[styles.raid, { backgroundColor: colors.ink2 }]} accessibilityRole="timer">
      <View style={styles.raidHead}>
        <AppText
          variant="small"
          weight="semibold"
          tone="onInk"
          numberOfLines={1}
          style={styles.flex}
        >
          {t('live.raiding', { player: directory.playerName(currentRaid.raider) })}
        </AppText>
        <AppText
          variant="clock"
          tone={low ? 'live' : 'onInk'}
        >{`${Math.ceil(remaining)}s`}</AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.ink }]}>
        <View
          style={[
            styles.bar,
            { width: `${ratio * 100}%`, backgroundColor: low ? colors.live : colors.brand },
          ]}
        />
      </View>
    </View>
  );
}

export default function LivePanel({ match, live, directory }) {
  const { t } = useTranslation();
  const next = live.nextRaidingTeam;
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <CourtStrip
          team={match.teamA?.name}
          onCourt={live.teams.A.onCourt.length}
          out={live.teams.A.out.length}
        />
        <AppText variant="small" weight="semibold" tone="onInk" style={styles.next}>
          {t('live.nextRaid', { team: directory.teamShort(next) })}
          {live.teams[next]?.doOrDieNext ? ` · ${t('live.doOrDie')}` : ''}
        </AppText>
        <CourtStrip
          team={match.teamB?.name}
          onCourt={live.teams.B.onCourt.length}
          out={live.teams.B.out.length}
          align="right"
        />
      </View>
      <RaidClock
        currentRaid={live.currentRaid}
        raidSeconds={live.rules.raidClockSeconds}
        directory={directory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  strip: { flexDirection: 'row', gap: 3, flexWrap: 'wrap', maxWidth: 90 },
  right: { justifyContent: 'flex-end' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  next: { flex: 1, textAlign: 'center' },
  raid: { borderRadius: RADII.md, padding: SPACING.md, gap: SPACING.sm },
  raidHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 3 },
});
