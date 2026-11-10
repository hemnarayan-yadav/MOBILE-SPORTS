// The card the match ends on, and the picture that is shared from it.
//
// It is a real view rather than a drawing: the same component is what the
// operator sees at full time and what `react-native-view-shot` captures, so the
// image can never disagree with the board it came from.
//
// Square, because that is the shape every chat and feed shows whole, and laid
// out like the board above it — the KhelScore wordmark, the two names, the
// score between them — so a shared result is recognisably from this app and not
// from a generic scoreboard.
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Logo from '../common/Logo.jsx';

const SIZE = 1080;
const PAD = 84;

const face = (weight = 'BarlowCondensed_700Bold') => ({ fontFamily: weight });

/**
 * `size` is the on-screen size; the card is laid out at 1080 and scaled, so the
 * captured image is the same picture at a resolution worth sharing however
 * small the phone showed it.
 */
const ResultCard = forwardRef(function ResultCard(
  { teams, palette, title, wonBy, drawLabel, dateText, size = SIZE },
  ref,
) {
  const scale = size / SIZE;
  const a = teams.A;
  const b = teams.B;
  const margin = a.score - b.score;
  const winner = margin > 0 ? a : margin < 0 ? b : null;
  const px = (value) => Math.round(value * scale);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        styles.card,
        { width: size, height: size, padding: px(PAD), backgroundColor: palette.bg, borderColor: palette.line },
      ]}
    >
      <View style={styles.head}>
        <Logo height={px(76)} color={palette.text} background={palette.bg} title="KhelScore" />
        <Text style={[face(), { fontSize: px(42), color: palette.accent, letterSpacing: px(3) }]}>
          {title.toUpperCase()}
        </Text>
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.team}>
          <Text
            numberOfLines={2}
            style={[face(), styles.centre, { fontSize: px(58), lineHeight: px(62), color: palette.text }]}
          >
            {(a.name || 'A').toUpperCase()}
          </Text>
          <Text style={[face(), styles.number, { fontSize: px(230), lineHeight: px(226), color: palette.text }]}>
            {a.score}
          </Text>
        </View>

        <Text style={[face(), { fontSize: px(96), color: palette.muted, marginBottom: px(40) }]}>–</Text>

        <View style={styles.team}>
          <Text
            numberOfLines={2}
            style={[face(), styles.centre, { fontSize: px(58), lineHeight: px(62), color: palette.text }]}
          >
            {(b.name || 'B').toUpperCase()}
          </Text>
          <Text style={[face(), styles.number, { fontSize: px(230), lineHeight: px(226), color: palette.text }]}>
            {b.score}
          </Text>
        </View>
      </View>

      <View style={[styles.verdict, { borderTopColor: palette.line, paddingTop: px(34) }]}>
        <Text
          numberOfLines={1}
          style={[face(), { fontSize: px(52), color: palette.text, letterSpacing: px(1) }]}
        >
          {winner ? wonBy(winner.name || (winner === a ? 'A' : 'B'), Math.abs(margin)) : drawLabel}
        </Text>
        <Text style={[{ fontFamily: 'Inter_600SemiBold', fontSize: px(30), color: palette.muted }]}>
          {dateText}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 2, justifyContent: 'space-between' },
  head: { alignItems: 'center', gap: 10 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  team: { flex: 1, alignItems: 'center' },
  centre: { textAlign: 'center' },
  number: { fontVariant: ['tabular-nums'] },
  verdict: { alignItems: 'center', gap: 8, borderTopWidth: 2 },
});

export default ResultCard;
