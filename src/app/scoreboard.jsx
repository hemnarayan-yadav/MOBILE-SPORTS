// The offline scoreboard.
//
// A match board somebody can open at a ground with no signal: two names, two
// scores, the half clock and the thirty-second raid clock. **It makes no
// network request of any kind** — no API, no socket, no analytics — so it works
// in airplane mode and costs the server nothing, ever.
//
// It is built to be mirrored onto a monitor (an HDMI adapter or a cast), which
// mirrors the phone's screen rather than giving the app a second one, so this
// single screen has to serve the operator and the crowd at once.
//
// **The layout is one middle column flanked by the two teams.** The wordmark,
// the half, the clock and the raid ring stack down the middle, with the
// operator's row under them; the two cards sit either side. That shape is what
// makes "hide the buttons" honest — the controls' height is reserved whether
// they are drawn or not, so the board on the monitor does not move when they
// go. Everything is sized from the screen's shorter side and held clear of the
// edges a television crops.
//
// Two looks, from the owner's design: Clean and Night
// (components/scoreboard/boardTheme.js).
//
// Nothing here is imported by the app's layout, so a phone that never opens the
// board pays nothing for it beyond the few kilobytes it adds to the bundle.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Button from '../components/common/Button.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Logo from '../components/common/Logo.jsx';
import Sheet from '../components/common/Sheet.jsx';
import TextField from '../components/common/TextField.jsx';
import BoardControls from '../components/scoreboard/BoardControls.jsx';
import BoardSide from '../components/scoreboard/BoardSide.jsx';
import ResultCard from '../components/scoreboard/ResultCard.jsx';
import { BoardMatchClock, BoardRaidRing } from '../components/scoreboard/BoardClocks.jsx';
import { BOARD_THEME_LIST, boardPalette, boardScale } from '../components/scoreboard/boardTheme.js';
import { holdScreenOn, lockOrientation, releaseScreen } from '../lib/boardNative.js';
import { playBoardSound, releaseBoardSounds } from '../lib/boardSounds.js';
import { shareResultCard } from '../lib/shareResultCard.js';
import { BOARD_PHASES, halfOf, isInPlay, useBoardStore } from '../store/boardStore.js';
import { DEFAULT_HALF_MINUTES, MAX_HALF_MINUTES, MIN_HALF_MINUTES } from '../utils/boardClock.js';

const KEEP_AWAKE_TAG = 'khelscore-board';
// How long the buttons come back for when the board is tapped while they are
// hidden: long enough to reach one, short enough that the crowd's view returns
// on its own.
// How long a tapped cue stays lit — about as long as the takes themselves run.
const CUE_MS = 1600;
// One point a tap, on the owner's decision.
const STEP = 1;

export default function ScoreboardScreen() {
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();

  const teams = useBoardStore((s) => s.teams);
  const phase = useBoardStore((s) => s.phase);
  const clock = useBoardStore((s) => s.clock);
  const raid = useBoardStore((s) => s.raid);
  const halfSeconds = useBoardStore((s) => s.halfSeconds);
  const theme = useBoardStore((s) => s.theme);
  const sound = useBoardStore((s) => s.sound);
  const endedAt = useBoardStore((s) => s.endedAt);

  const setName = useBoardStore((s) => s.setName);
  const addPoint = useBoardStore((s) => s.addPoint);
  const toggleMatchClock = useBoardStore((s) => s.toggleMatchClock);
  const startRaid = useBoardStore((s) => s.startRaid);
  const clearRaid = useBoardStore((s) => s.clearRaid);
  const shiftMatchClock = useBoardStore((s) => s.shiftMatchClock);
  const setHalfMinutes = useBoardStore((s) => s.setHalfMinutes);
  const endHalf = useBoardStore((s) => s.endHalf);
  const endMatch = useBoardStore((s) => s.endMatch);
  const setTheme = useBoardStore((s) => s.setTheme);
  const setSound = useBoardStore((s) => s.setSound);
  const newMatch = useBoardStore((s) => s.newMatch);

  const [renaming, setRenaming] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [lit, setLit] = useState(null);
  const cardRef = useRef(null);
  const litTimer = useRef(null);

  const palette = useMemo(() => boardPalette(theme), [theme]);
  const scale = useMemo(() => boardScale(dimensions), [dimensions]);
  const running = Boolean(clock?.runningSince);
  const inPlay = isInPlay(phase);
  const half = halfOf(phase);
  const raidIdle = !raid?.runningSince && (raid?.elapsedMs ?? 0) === 0;

  // Landscape, and the screen stays lit. A scoreboard that sleeps in the middle
  // of a half is no use, and the app is portrait everywhere else, so both are
  // put back when the board is left.
  //
  // Both are optional (lib/boardNative.js): a build made before these modules
  // were added still shows a working board, upright and able to sleep, rather
  // than failing to open at all.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await lockOrientation(true);
      if (!cancelled) await holdScreenOn(KEEP_AWAKE_TAG);
    })();
    return () => {
      cancelled = true;
      releaseScreen(KEEP_AWAKE_TAG);
      lockOrientation(false);
      releaseBoardSounds();
    };
  }, []);

  useEffect(
    () => () => {
      clearTimeout(litTimer.current);
    },
    [],
  );

  // Leaving by the system back gesture closes whatever is open first, so the
  // board is never left with a sheet over it.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menuOpen || renaming || confirmNew) {
        setMenuOpen(false);
        setRenaming(null);
        setConfirmNew(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [menuOpen, renaming, confirmNew]);

  // A cue: the sound if the board is making noise, and the button lit either
  // way so the operator can see the tap landed.
  const fireCue = useCallback(
    (kind) => {
      if (sound) playBoardSound(kind);
      setLit(kind);
      clearTimeout(litTimer.current);
      litTimer.current = setTimeout(() => setLit(null), CUE_MS);
    },
    [sound],
  );

  const openRename = useCallback((side) => {
    setRenaming(side);
    setDraftName(useBoardStore.getState().teams[side].name);
  }, []);
  const commitName = () => {
    setName(renaming, draftName.trim());
    setRenaming(null);
  };

  const addA = useCallback(() => addPoint('A', STEP), [addPoint]);
  const removeA = useCallback(() => addPoint('A', -STEP), [addPoint]);
  const addB = useCallback(() => addPoint('B', STEP), [addPoint]);
  const removeB = useCallback(() => addPoint('B', -STEP), [addPoint]);

  // One tap on the raid: start it, or put it back to thirty.
  const onRaidTap = useCallback(() => {
    if (!inPlay) return;
    if (raidIdle) startRaid();
    else clearRaid();
  }, [inPlay, raidIdle, startRaid, clearRaid]);

  const phaseAction =
    phase === BOARD_PHASES.FIRST
      ? { label: t('app.board.endHalf'), onPress: endHalf }
      : phase === BOARD_PHASES.SECOND
        ? { label: t('app.board.endMatch'), onPress: endMatch }
        : null;

  const onShare = async () => {
    setSharing(true);
    try {
      await shareResultCard(cardRef, t('app.board.shareTitle'));
    } finally {
      setSharing(false);
    }
  };

  const cardSize = Math.round(Math.min(dimensions.width, dimensions.height) * 0.82);
  const dateText = new Date(endedAt ?? Date.now()).toLocaleDateString();

  const sideProps = (side) => ({
    side,
    name: teams[side].name,
    score: teams[side].score,
    placeholder: t(side === 'A' ? 'app.board.teamA' : 'app.board.teamB'),
    scoreLabel: t('app.board.score'),
    addLabel: t('app.board.addPoint'),
    removeLabel: t('app.board.removePoint'),
    palette,
    scale,
    onAdd: side === 'A' ? addA : addB,
    onRemove: side === 'A' ? removeA : removeB,
    onRename: () => openRename(side),
  });

  const clockFace = (
    <BoardMatchClock
      clock={clock}
      halfSeconds={halfSeconds[half]}
      size={scale.clock}
      color={palette.text}
      stoppedColor={palette.raidUrgent}
    />
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.page }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.root}>
        <View style={[styles.board, { padding: scale.gutter, gap: scale.gutter }]}>
          <BoardSide {...sideProps('A')} />

          {/* The middle: who made this, which half, the clock, the raid, and
              the operator's row — in that order, top to bottom. */}
          <View style={[styles.centre, { gap: scale.gutter * 0.4 }]}>
            <Logo height={scale.logo} color={palette.text} background={palette.page} title="KhelScore" />
            <Text
              style={{
                fontFamily: 'BarlowCondensed_700Bold',
                fontSize: scale.pill,
                letterSpacing: scale.pill * 0.24,
                paddingLeft: scale.pill * 0.24,
                paddingRight: scale.pill * 0.5,
                paddingVertical: scale.pill * 0.28,
                borderRadius: 999,
                overflow: 'hidden',
                color: palette.pillText,
                backgroundColor: palette.pill,
              }}
            >
              {t('app.board.half', { number: half }).toUpperCase()}
            </Text>

            {/* The clock is its own start/pause control: a target far bigger
                than any button, and one less thing on a screen the crowd is
                also looking at. Its label is the state the tap will put the
                clock into, so a reader hears "Start", then "Pause".

                It is disabled between the halves and at full time, when
                there is no half for a tap to start. */}
            <Pressable
              onPress={toggleMatchClock}
              disabled={!inPlay}
              accessibilityRole="button"
              accessibilityState={{ disabled: !inPlay }}
              accessibilityLabel={running ? t('app.board.pause') : t('app.board.start')}
              testID="board-clock-toggle"
            >
              {clockFace}
            </Pressable>

            <Pressable
              onPress={onRaidTap}
              accessibilityRole="button"
              accessibilityLabel={t('app.board.raid')}
              testID="board-raid"
            >
              <BoardRaidRing
                raid={raid}
                palette={palette}
                scale={scale}
                soundOn={sound}
                caption={raidIdle ? t('app.board.tapToStart') : t('app.board.tapToClear')}
              />
            </Pressable>

            <View style={{ height: scale.control, justifyContent: 'center' }}>
              <BoardControls
                palette={palette}
                scale={scale}
                lit={lit}
                labels={{
                  doOrDie: t('app.board.doOrDie'),
                  doOrDieShort: t('app.board.doOrDieShort'),
                  siren: t('app.board.siren'),
                  sirenShort: t('app.board.sirenShort'),
                  menu: t('app.board.settings'),
                }}
                onDoOrDie={() => fireCue('doOrDie')}
                onSiren={() => fireCue('siren')}
                onMenu={() => setMenuOpen(true)}
              />
            </View>
          </View>

          <BoardSide {...sideProps('B')} />
        </View>
      </View>

      {/* Full time: the card, and the picture it makes. */}
      <Modal visible={phase === BOARD_PHASES.FULL_TIME} transparent animationType="fade">
        <View style={[styles.resultScrim, { backgroundColor: palette.page }]}>
          <ScrollView contentContainerStyle={styles.resultScroll}>
            <ResultCard
              ref={cardRef}
              teams={teams}
              palette={{
                bg: palette.panel,
                text: palette.text,
                muted: palette.muted,
                line: palette.line,
                accent: palette.accent,
              }}
              title={t('app.board.fullTime')}
              wonBy={(name, by) => t('app.board.wonBy', { team: name, count: by })}
              drawLabel={t('app.board.draw')}
              dateText={dateText}
              size={cardSize}
            />
            <View style={styles.resultActions}>
              <Button onPress={onShare} loading={sharing}>
                {t('app.board.shareResult')}
              </Button>
              <Button variant="secondary" onPress={() => setConfirmNew(true)}>
                {t('app.board.newMatch')}
              </Button>
              <Button variant="ghost" onPress={() => router.back()}>
                {t('common.close')}
              </Button>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Sheet open={Boolean(renaming)} onClose={() => setRenaming(null)} title={t('app.board.teamName')}>
        <TextField
          label={t('app.board.teamName')}
          value={draftName}
          onChangeText={setDraftName}
          autoFocus
          maxLength={24}
          onSubmitEditing={commitName}
          returnKeyType="done"
        />
        <Button onPress={commitName}>{t('common.done')}</Button>
      </Sheet>

      {/* Three short rows rather than a column of buttons: the board is
          landscape, and a tall sheet would cover the match. */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={t('app.board.settings')}>
        <View style={styles.menuRow}>
          {BOARD_THEME_LIST.map((name) => (
            <Button
              key={name}
              variant={theme === name ? 'primary' : 'secondary'}
              onPress={() => setTheme(name)}
              style={styles.cell}
            >
              {t(`app.board.themeName.${name}`)}
            </Button>
          ))}
          <Button variant="secondary" onPress={() => setSound(!sound)} style={styles.cell}>
            {t(sound ? 'app.board.soundOn' : 'app.board.soundOff')}
          </Button>
          {phaseAction ? (
            <Button
              onPress={() => {
                setMenuOpen(false);
                phaseAction.onPress();
              }}
              testID="board-phase-action"
              style={styles.cell}
            >
              {phaseAction.label}
            </Button>
          ) : null}
        </View>

        <View style={styles.menuRow}>
          <View style={styles.cell}>
            <HalfField
              label={t('app.board.firstHalfMinutes')}
              seconds={halfSeconds[1]}
              onChange={(minutes) => setHalfMinutes(1, minutes)}
            />
          </View>
          <View style={styles.cell}>
            <HalfField
              label={t('app.board.secondHalfMinutes')}
              seconds={halfSeconds[2]}
              onChange={(minutes) => setHalfMinutes(2, minutes)}
            />
          </View>
          <Button
            variant="secondary"
            style={styles.cell}
            onPress={() => {
              setMenuOpen(false);
              setConfirmNew(true);
            }}
          >
            {t('app.board.newMatch')}
          </Button>
        </View>

        <View style={styles.menuRow}>
          <Button variant="secondary" style={styles.cell} onPress={() => shiftMatchClock(60)} disabled={!inPlay}>
            {t('app.board.addMinute')}
          </Button>
          <Button variant="secondary" style={styles.cell} onPress={() => shiftMatchClock(-60)} disabled={!inPlay}>
            {t('app.board.cutMinute')}
          </Button>
        </View>
      </Sheet>

      <ConfirmDialog
        open={confirmNew}
        title={t('app.board.newMatch')}
        message={t('app.board.newMatchConfirm')}
        confirmLabel={t('app.board.newMatch')}
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          setConfirmNew(false);
          newMatch();
        }}
      />
    </SafeAreaView>
  );
}

function HalfField({ label, seconds, onChange }) {
  const [text, setText] = useState(String(Math.round(seconds / 60)));
  useEffect(() => setText(String(Math.round(seconds / 60))), [seconds]);
  return (
    <TextField
      label={label}
      value={text}
      onChangeText={setText}
      onBlur={() => onChange(text === '' ? DEFAULT_HALF_MINUTES : Number(text))}
      keyboardType="number-pad"
      maxLength={2}
      hint={`${MIN_HALF_MINUTES}–${MAX_HALF_MINUTES}`}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  board: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  centre: { alignItems: 'center', justifyContent: 'center' },
  resultScrim: { flex: 1 },
  resultScroll: { alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16, flexGrow: 1 },
  resultActions: { width: '100%', maxWidth: 420, gap: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  cell: { flex: 1 },
});
