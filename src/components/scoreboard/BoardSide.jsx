// One team's half of the board: the name, the score, and the two buttons that
// move it.
//
// **Name at the top, score in the middle, buttons at the bottom.** The three
// used to sit together in the centre of the card with empty page above and
// below them; spreading them to the card's three edges is what lets the score
// be as large as it is, and it puts the two buttons under the thumb that holds
// the phone rather than halfway up it.
//
// Memoized, and given nothing but primitives and stable callbacks, so a ticking
// clock never repaints it. The score is the largest thing on the screen because
// it is the one thing the crowd is reading.
//
// Scoring is one point at a time, on the owner's decision — a raid worth three
// is three taps, which is one rule to remember instead of three buttons to aim
// at — with a minus for the tap that should not have happened.
//
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const DISPLAY = 'BarlowCondensed_700Bold';
const QUIET = 0.25;

function StepButton({ label, accessibilityLabel, onPress, size, borderColor, color }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 3,
        borderWidth: 1,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 1 : QUIET,
      })}
    >
      <Text style={{ fontSize: size * 0.58, fontWeight: '600', lineHeight: size * 0.7, color }}>
        {label}
      </Text>
    </Pressable>
  );
}

const BoardSide = memo(function BoardSide({
  side,
  name,
  score,
  placeholder,
  scoreLabel,
  addLabel,
  removeLabel,
  palette,
  scale,
  onAdd,
  onRemove,
  onRename,
}) {
  const accent = side === 'A' ? palette.teamA : palette.teamB;

  return (
    <View
      style={[
        styles.side,
        {
          backgroundColor: palette.panel,
          borderColor: palette.line,
          borderRadius: Math.round(scale.control * 0.8),
          paddingVertical: scale.gutterV,
        },
      ]}
    >
      <View style={styles.head}>
        <Pressable
          onPress={onRename}
          accessibilityRole="button"
          accessibilityLabel={name || placeholder}
          hitSlop={8}
        >
          <Text
            numberOfLines={1}
            style={{
              fontFamily: DISPLAY,
              fontSize: scale.teamName,
              lineHeight: scale.teamName * 1.05,
              letterSpacing: scale.teamName * 0.06,
              color: name ? palette.text : palette.faint,
              textAlign: 'center',
            }}
          >
            {(name || placeholder).toUpperCase()}
          </Text>
        </Pressable>

        {/* The design's accent rule under the name. */}
        <View
          style={{
            width: scale.teamName,
            height: 5,
            borderRadius: 3,
            backgroundColor: accent,
            marginTop: 5,
          }}
        />
      </View>

      {/* The score takes whatever the name and the buttons leave, and sits in
          the middle of it. */}
      <View style={styles.scoreBox}>
        <Text
          accessibilityLabel={`${scoreLabel}: ${score}`}
          style={{
            fontFamily: DISPLAY,
            fontSize: scale.score,
            lineHeight: scale.score * 0.88,
            color: palette.text,
            fontVariant: ['tabular-nums'],
          }}
        >
          {score}
        </Text>
      </View>

      <View style={[styles.steps, { height: scale.step, gap: scale.step * 0.3 }]}>
        <StepButton
          label="−"
          accessibilityLabel={removeLabel}
          onPress={onRemove}
          size={scale.step}
          borderColor={palette.control}
          color={palette.controlText}
        />
        <StepButton
          label="+"
          accessibilityLabel={addLabel}
          onPress={onAdd}
          size={scale.step}
          borderColor={accent}
          color={accent}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  side: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
  },
  head: { alignItems: 'center', alignSelf: 'stretch' },
  scoreBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

export default BoardSide;
