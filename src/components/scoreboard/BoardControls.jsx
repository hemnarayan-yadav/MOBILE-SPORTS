// The operator's row, centred under the raid ring: the two cues and the ⋯ menu.
//
// There is no play/pause button here. The clock itself is the control — tapping
// it starts and stops the half — which is one less thing on a screen the crowd
// is also looking at, and a target far bigger than any button could be.
//
// The cues sit at a quarter opacity until they are touched (the design's `.pm`
// rule): they are for the operator, and the crowd is reading the score. Tapping
// one lights it in its own colour for as long as the take runs, so the operator
// can see the tap landed from across a ground — whether or not the sound is on.
//
// All three wear a short face — DOD, S, ••• — at one fixed width, so the row is
// three identical squares the thumb can find without reading them. The full
// words stay as each button's accessibility label, which is what a screen
// reader announces and what the tests reach for.
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const DISPLAY = 'BarlowCondensed_700Bold';
const QUIET = 0.25;

function Cue({ label, face, onPress, lit, scale, borderColor, textColor, litBg, litText }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => ({
        width: scale.control * 1.2,
        height: scale.control,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: lit ? litBg : borderColor,
        backgroundColor: lit ? litBg : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: lit || pressed ? 1 : QUIET,
      })}
    >
      <Text
        style={{
          fontFamily: DISPLAY,
          fontSize: scale.label * 1.1,
          letterSpacing: scale.label * 0.12,
          color: lit ? litText : textColor,
        }}
      >
        {face}
      </Text>
    </Pressable>
  );
}

const BoardControls = memo(function BoardControls({
  palette,
  scale,
  lit,
  labels,
  onDoOrDie,
  onSiren,
  onMenu,
}) {
  return (
    <View style={[styles.row, { height: scale.control, gap: scale.control * 0.3 }]}>
      <Cue
        label={labels.doOrDie}
        face={labels.doOrDieShort}
        onPress={onDoOrDie}
        lit={lit === 'doOrDie'}
        scale={scale}
        borderColor={palette.dodBorder}
        textColor={palette.dodText}
        litBg={palette.dodOn}
        litText={palette.dodOnText}
      />
      <Cue
        label={labels.siren}
        face={labels.sirenShort}
        onPress={onSiren}
        lit={lit === 'siren'}
        scale={scale}
        borderColor={palette.sirenBorder}
        textColor={palette.sirenText}
        litBg={palette.sirenOn}
        litText={palette.sirenOnText}
      />
      <Pressable
        onPress={onMenu}
        accessibilityRole="button"
        accessibilityLabel={labels.menu}
        testID="board-menu"
        hitSlop={10}
        style={({ pressed }) => ({
          width: scale.control * 1.2,
          height: scale.control,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: palette.control,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 1 : QUIET,
        })}
      >
        <Text style={{ fontSize: scale.label * 1.1, fontWeight: '700', color: palette.controlText }}>•••</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

export default BoardControls;
