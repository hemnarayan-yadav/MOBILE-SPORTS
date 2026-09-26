// More — the rest of the app (teams, players, news, following, the account)
// and the website's information pages, which open in an in-app browser rather
// than being rebuilt in the app (plan decision D20).
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/common/AppText.jsx';
import { LanguageSwitcher, ThemeToggle } from '../../components/common/Controls.jsx';
import { Card } from '../../components/common/Layout.jsx';
import { env } from '../../config/env.js';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { MIN_TOUCH, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';

// Website paths (frontend/src/routes/routes.jsx) and their labels.
const WEB_PAGES = Object.freeze([
  ['/about', 'nav.about'],
  ['/pricing', 'nav.pricing'],
  ['/faq', 'nav.faq'],
  ['/contact', 'nav.contact'],
  ['/gallery', 'nav.gallery'],
  ['/legal/privacy', 'legal.privacyTitle'],
  ['/legal/terms', 'legal.termsTitle'],
]);

const openWebPage = (path) => WebBrowser.openBrowserAsync(`${env.SITE_URL}${path}`);

function Row({ label, onPress, hint }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint={hint}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border },
      ]}
    >
      <AppText weight="semibold" style={styles.flex}>
        {label}
      </AppText>
      <AppText tone="muted">›</AppText>
    </Pressable>
  );
}

export default function More() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const status = useAuthStore((s) => s.status);
  const signedIn = status === AUTH_STATUS.AUTHENTICATED;

  const appRows = [
    ['/teams', 'nav.teams'],
    ['/players', 'nav.players'],
    ['/news', 'nav.news'],
    ...(signedIn ? [['/dashboard/following', 'nav.following']] : []),
    signedIn ? ['/dashboard/profile', 'app.account'] : ['/auth/login', 'nav.login'],
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="heading" accessibilityRole="header">
          {t('nav.more')}
        </AppText>
        <Card>
          {appRows.map(([path, label]) => (
            <Row key={path} label={t(label)} onPress={() => router.push(path)} />
          ))}
        </Card>
        <Card>
          <View style={styles.setting}>
            <AppText style={styles.flex}>{t('common.language')}</AppText>
            <LanguageSwitcher />
          </View>
          <View style={styles.setting}>
            <AppText style={styles.flex}>{t('theme.label')}</AppText>
            <ThemeToggle />
          </View>
        </Card>
        <AppText variant="label" tone="muted">
          {t('app.onWebsite')}
        </AppText>
        <Card>
          {WEB_PAGES.map(([path, label]) => (
            <Row
              key={path}
              label={t(label)}
              hint={t('app.onWebsite')}
              onPress={() => openWebPage(path)}
            />
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  setting: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
});
