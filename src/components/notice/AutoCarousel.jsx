import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';

// Shows a window of items and moves it on by itself, so a short section on
// Home can still carry a long list. Two at a time on Home: enough to be worth
// looking at, few enough that the section does not take over the screen.
//
// Auto-advancing content is the easiest thing in an interface to get wrong, so
// three rules hold here:
//
//  * **It stops the moment it is touched.** Someone reading the second card
//    must never have it slide away mid-sentence.
//  * **It can be driven by hand.** The dots are buttons; the timer is an
//    extra, not the only way through.
//  * **It honours "Remove animations".** Android's own accessibility setting
//    turns the movement off entirely rather than merely slowing it.
const ADVANCE_MS = 10_000;

export default function AutoCarousel({ items, perPage = 2, renderItem, keyExtractor }) {
  const { colors } = useTheme();
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  // A page the reader chose is theirs; the timer does not take it back until
  // they leave the section alone again.
  const touched = useRef(false);

  const pages = Math.ceil(items.length / perPage);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => alive && setReduceMotion(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || pages <= 1) return undefined;
    const timer = setInterval(() => setPage((current) => (current + 1) % pages), ADVANCE_MS);
    return () => clearInterval(timer);
  }, [reduceMotion, paused, pages]);

  // A list that shrank under a page the reader was on.
  useEffect(() => {
    if (page >= pages) setPage(0);
  }, [page, pages]);

  const start = page * perPage;
  const visible = items.slice(start, start + perPage);

  return (
    <View
      // Touching anywhere in the section holds it still; letting go starts the
      // timer again.
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => {
        if (!touched.current) setPaused(false);
      }}
    >
      <View style={styles.stack}>
        {visible.map((item, index) => (
          <View key={keyExtractor(item)}>{renderItem(item, start + index)}</View>
        ))}
      </View>

      {pages > 1 ? (
        <View style={styles.dots} accessibilityRole="tablist">
          {Array.from({ length: pages }, (_, index) => {
            const active = index === page;
            return (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${index + 1} / ${pages}`}
                hitSlop={SPACING.sm}
                onPress={() => {
                  touched.current = true;
                  setPaused(true);
                  setPage(index);
                }}
                style={[
                  styles.dot,
                  {
                    backgroundColor: active ? colors.brand : colors.border,
                    width: active ? SPACING.lg : SPACING.sm,
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.md },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.md,
  },
  dot: { height: SPACING.sm, borderRadius: RADII.full },
});
