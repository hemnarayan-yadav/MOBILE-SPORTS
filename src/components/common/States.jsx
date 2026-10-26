import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorText } from '../../utils/apiErrors.js';
import AppText from './AppText.jsx';

// How long the retry button keeps its spinner even when the attempt settles at
// once. A failed refetch re-renders the same error state, so without a visible
// answer the press reads as a dead control — which is how Play review saw it
// (rejected 2026-10-22, "unresponsive UI elements, such as buttons or icons").
const RETRY_FEEDBACK_MS = 600;

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
  const [retrying, setRetrying] = useState(false);
  // The press can outlive the screen (a retry that succeeds navigates away),
  // so the spinner is only cleared while this state still exists.
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );

  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      // `refetch()` settles rather than throwing, but a caller may hand us
      // anything; a rejection here must not become an unhandled rejection.
      await Promise.all([
        Promise.resolve()
          .then(onRetry)
          .catch(() => {}),
        new Promise((resolve) => {
          setTimeout(resolve, RETRY_FEEDBACK_MS);
        }),
      ]);
    } finally {
      if (alive.current) setRetrying(false);
    }
  }, [onRetry, retrying]);

  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <AppText weight="semibold" style={styles.center}>
        {apiErrorText(t, error)}
      </AppText>
      <AppText variant="small" tone="muted" style={styles.center}>
        {t('common.errorHint')}
      </AppText>
      {onRetry ? (
        <Pressable
          onPress={handleRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityState={{ busy: retrying, disabled: retrying }}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: colors.brandBtn, opacity: pressed || retrying ? 0.85 : 1 },
          ]}
        >
          {retrying ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <AppText weight="semibold" tone="onBrand">
              {t('common.retry')}
            </AppText>
          )}
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
