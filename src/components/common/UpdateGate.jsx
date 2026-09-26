import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mobileApi } from '../../api/mobile.api.js';
import { qk } from '../../api/queryKeys.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { isVersionOlder } from '../../utils/version.js';
import AppText from './AppText.jsx';
import Button from './Button.jsx';
import Logo from './Logo.jsx';

const CONFIG_STALE_MS = 30 * 60_000;
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

function storeLinks() {
  const pkg = Constants.expoConfig?.android?.package;
  return {
    app: `market://details?id=${pkg}`,
    web: `https://play.google.com/store/apps/details?id=${pkg}`,
  };
}

async function openStore() {
  const { app, web } = storeLinks();
  try {
    await Linking.openURL(app);
  } catch {
    await Linking.openURL(web);
  }
}

// The oldest version still allowed to run (GET /mobile/config). An older app
// shows only this screen; when the answer cannot be fetched (offline, API down)
// the app runs normally — a lost request must never lock anyone out.
export function useUpdateRequired() {
  const config = useQuery({
    queryKey: qk.mobile.config,
    queryFn: mobileApi.config,
    staleTime: CONFIG_STALE_MS,
    retry: false,
  });
  const minimum = config.data?.minSupportedVersion?.[Platform.OS];
  return Boolean(minimum) && isVersionOlder(APP_VERSION, minimum);
}

export default function UpdateGate({ children }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (!useUpdateRequired()) return children;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Logo height={36} title={t('nav.brand')} />
        </View>
        <AppText variant="title" accessibilityRole="header" style={styles.center}>
          {t('app.updateTitle')}
        </AppText>
        <AppText tone="muted" style={styles.center}>
          {t('app.updateBody')}
        </AppText>
        <Button onPress={openStore}>{t('app.updateCta')}</Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  logo: { alignItems: 'center' },
  center: { textAlign: 'center' },
});
