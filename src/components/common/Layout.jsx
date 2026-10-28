// Screen building blocks after the web's Layout.jsx: a titled section, a stat
// tile, a card, a back header for stack screens, and a horizontal tab strip.
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';

export function Card({ children, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      {children}
    </View>
  );
}

export function Section({ title, action, children }) {
  const router = useRouter();
  return (
    <View style={styles.section}>
      {title || action ? (
        <View style={styles.sectionHead}>
          {title ? (
            <AppText variant="title" display accessibilityRole="header" style={styles.flex}>
              {title}
            </AppText>
          ) : null}
          {action ? (
            <Pressable
              onPress={() => router.push(action.to)}
              accessibilityRole="link"
              style={styles.action}
            >
              <AppText weight="semibold" tone="brandStrong">
                {action.label} ›
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function StatTile({ label, value, hint }) {
  return (
    <Card style={styles.tile}>
      <AppText variant="label" tone="muted" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="score">{value}</AppText>
      {hint ? (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </Card>
  );
}

// Two tiles per row.
export function TileGrid({ children }) {
  return <View style={styles.grid}>{children}</View>;
}

// Back action and title for a stack screen that is not a form (lists and detail
// screens use it inside their own scroll view).
//
// Home sits beside Back because this app is read by following links: a
// tournament leads to a team, the team to a player, the player to another
// match. Four screens deep, Back is four taps from where somebody wanted to
// be — so the way out is one tap, and it empties the stack rather than
// stacking home on top of it.
export function BackHeader({ title }) {
  const { t } = useTranslation();
  const router = useRouter();
  const goHome = () => {
    if (router.canDismiss?.()) router.dismissAll();
    router.navigate('/');
  };
  return (
    <View style={styles.backHeader}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.back}
        >
          <AppText weight="semibold" tone="muted">
            {`‹ ${t('common.back')}`}
          </AppText>
        </Pressable>
        <Pressable
          onPress={goHome}
          accessibilityRole="button"
          accessibilityLabel={t('nav.home')}
          style={styles.back}
        >
          <AppText weight="semibold" tone="muted">
            {t('nav.home')}
          </AppText>
        </Pressable>
      </View>
      {title ? (
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
    </View>
  );
}

// A row of tabs that scrolls sideways when it does not fit (the web's <Tabs>).
export function TabStrip({ tabs, value, onChange, label }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      contentContainerStyle={styles.tabs}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.tab,
              {
                backgroundColor: active ? colors.ink : colors.surface2,
                borderColor: active ? colors.ink : colors.border,
              },
            ]}
          >
            {/* One line, and the tab never shrinks: a Devanagari label is
                longer than its English twin, and the Hindi ranking tabs were
                wrapping and showing only their first word ("बेस्ट"). */}
            <AppText weight="semibold" tone={active ? 'onInk' : 'muted'} numberOfLines={1}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.sm },
  section: { gap: SPACING.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1 },
  action: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  tile: { flexBasis: '47%', flexGrow: 1, padding: SPACING.md, gap: SPACING.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  backHeader: { gap: SPACING.xs },
  back: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  tab: {
    minHeight: MIN_TOUCH - 4,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.full,
    borderWidth: 1,
    // The strip scrolls sideways, so a tab keeps the width its label needs
    // instead of being squeezed by the ones beside it.
    flexShrink: 0,
  },
});
