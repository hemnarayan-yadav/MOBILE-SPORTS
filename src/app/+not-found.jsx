// A link the app cannot open yet — a shared `/join/<token>` invitation, say,
// whose screen arrives with the captain phase, or a path from a newer website.
// Rather than a blank screen, it says so and leads back into the app; the link
// itself still works in a browser.
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/common/AppText.jsx';
import Button from '../components/common/Button.jsx';
import { SPACING } from '../theme/tokens.js';
import { useTheme } from '../theme/useTheme.js';

export default function NotFound() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <AppText variant="title" accessibilityRole="header" style={styles.center}>
          {t('errors.notFound')}
        </AppText>
        <Button onPress={() => router.replace('/')}>{t('nav.home')}</Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: SPACING.xl, gap: SPACING.lg },
  center: { textAlign: 'center' },
});
