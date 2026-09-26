import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import AppText from './AppText.jsx';

export function LoadingState() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.brand} />
      <AppText tone="muted">{t('common.loading')}</AppText>
    </View>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <View style={styles.box}>
      <AppText weight="semibold" style={styles.center}>
        {title}
      </AppText>
      {hint ? (
        <AppText variant="small" tone="muted" style={styles.center}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

// A failed request, in the reader's language: the API error code is mapped to
// its translation (utils/apiErrors.js), never the server's own text.
export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <AppText weight="semibold" style={styles.center}>
        {t(apiErrorKey(error))}
      </AppText>
      <AppText variant="small" tone="muted" style={styles.center}>
        {t('common.errorHint')}
      </AppText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: colors.brandBtn, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <AppText weight="semibold" tone="onBrand">
            {t('common.retry')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  center: { textAlign: 'center' },
  retry: {
    marginTop: SPACING.sm,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.md,
  },
});
