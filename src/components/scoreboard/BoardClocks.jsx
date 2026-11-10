// The board's clocks, each in a component of its own.
//
// This separation is the whole performance story. Only these subscribe to a
// tick, so a running clock repaints a few digits and the raid ring, never the
// scores, the names or the buttons. And when a clock is stopped the tick is
// switched off entirely (`useNow(…, enabled)`), so a board sitting at the
// interval does no work at all.
//
// Neither reads the server clock. This board is offline by design, so the
// phone's own time is the only time there is.
import { memo, useEffect, useRef } from 'react';
import { Text, Vibration, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useNow } from '../../hooks/useNow.js';
import { COUNTDOWN_AT_SECONDS, playBoardSound, stopCountdown } from '../../lib/boardSounds.js';
import { RAID_SECONDS } from '../../utils/boardClock.js';
import { clockRemainingSeconds, formatClock } from '../../utils/format.js';
import { raidTone } from './boardTheme.js';

const MATCH_TICK_MS = 500;
// The raid is counted whole seconds at a time, and a quarter-second tick keeps
// the last one from appearing to stick.
const RAID_TICK_MS = 250;
const BUZZ_MS = 400;
const DISPLAY = 'BarlowCondensed_700Bold';

const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

/**
 * Minutes and seconds left in the half.
 *
 * **A red clock is a clock that is not counting.** Running it is the board's
 * ordinary ink; paused, between the halves, at full time or run out it turns
 * red, so a glance from across a ground says whether the match is live without
 * anybody having to watch the digits for a second to see if they move. The two
 * reasons it stops — somebody paused it, or the half ran out — are one colour
 * on purpose: both mean the same thing to a crowd.
 */
export const BoardMatchClock = memo(function BoardMatchClock({
  clock,
  halfSeconds,
  size,
  color,
  stoppedColor,
  style,
}) {
  const running = Boolean(clock?.runningSince);
  const now = useNow(MATCH_TICK_MS, running);
  const remaining = clockRemainingSeconds(clock, halfSeconds, now);
  const text = formatClock(remaining);
  return (
    <Text
      accessibilityLabel={text}
      style={[
        {
          fontFamily: DISPLAY,
          fontSize: size,
          lineHeight: size * 0.98,
          letterSpacing: size * 0.02,
          color: running && remaining > 0 ? color : stoppedColor,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {text}
    </Text>
  );
});

/**
 * What every raid display needs: the seconds left, the colour they are shown
 * in, and the two sounds the last ten seconds owe the ground.
 *
 * The countdown take is started **once per raid**, as the clock crosses ten,
 * keyed on the raid's own start so a re-render, a pause or a reset cannot
 * start it twice. A raid that ends early takes it away again — the whistle has
 * gone, so the count has nothing left to count.
 */
function useRaidSeconds(raid, soundOn) {
  const running = Boolean(raid?.runningSince);
  const now = useNow(RAID_TICK_MS, running);
  const remaining = Math.ceil(clockRemainingSeconds(raid, RAID_SECONDS, now));

  const countedFor = useRef(null);
  const buzzedFor = useRef(null);
  const id = raid?.runningSince ?? null;

  useEffect(() => {
    if (!running) {
      // The raid is over or was cleared: nothing left to count down to.
      if (countedFor.current !== null) stopCountdown();
      countedFor.current = null;
      buzzedFor.current = null;
      return;
    }
    if (remaining <= COUNTDOWN_AT_SECONDS && remaining > 0 && countedFor.current !== id) {
      countedFor.current = id;
      if (soundOn) playBoardSound('countdown');
    }
    if (remaining <= 0 && buzzedFor.current !== id) {
      buzzedFor.current = id;
      Vibration.vibrate(BUZZ_MS);
    }
  }, [running, remaining, id, soundOn]);

  return { remaining, running };
}

/**
 * The Clean Light raid: a ring that empties as the raid runs, with the count
 * in the middle. Drawn with an SVG arc rather than a conic gradient, which
 * React Native has no equivalent of.
 */
export const BoardRaidRing = memo(function BoardRaidRing({ raid, palette, scale, soundOn, caption }) {
  const { remaining, running } = useRaidSeconds(raid, soundOn);
  const tone = raidTone(palette, remaining, running);
  const idle = !running && remaining >= RAID_SECONDS;

  const size = scale.ring;
  const stroke = Math.max(10, Math.round(size * 0.06));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const left = Math.max(0, Math.min(RAID_SECONDS, remaining)) / RAID_SECONDS;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.ringTrack} strokeWidth={stroke} fill="none" />
        {idle ? null : (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={tone}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - left)}
            // Start the arc at twelve o'clock and empty clockwise.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View
        style={{
          width: size - stroke * 2.4,
          height: size - stroke * 2.4,
          borderRadius: size,
          backgroundColor: palette.panel,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: DISPLAY, fontSize: scale.raidLabel, letterSpacing: scale.raidLabel * 0.3, color: palette.muted }}>
          RAID
        </Text>
        <Text
          style={{
            fontFamily: DISPLAY,
            fontSize: scale.raidNumber,
            lineHeight: scale.raidNumber * 0.9,
            color: idle ? palette.raidIdle : tone,
            fontVariant: ['tabular-nums'],
          }}
        >
          {pad2(remaining)}
        </Text>
        <Text style={{ fontFamily: DISPLAY, fontSize: scale.label * 0.8, letterSpacing: scale.label * 0.2, color: palette.faint }}>
          {caption.toUpperCase()}
        </Text>
      </View>
    </View>
  );
});
