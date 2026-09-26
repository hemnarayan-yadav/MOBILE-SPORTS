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
export function BackHeader({ title }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.backHeader}>
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
            <AppText weight="semibold" tone={active ? 'onInk' : 'muted'}>
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
  back: { minHeight: MIN_TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  tabs: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  tab: {
    minHeight: MIN_TOUCH - 4,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
});
