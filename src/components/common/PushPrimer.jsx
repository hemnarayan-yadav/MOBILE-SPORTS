import { useTranslation } from 'react-i18next';
import { View, StyleSheet } from 'react-native';
import { SPACING } from '../../theme/tokens.js';
import AppText from './AppText.jsx';
import Button from './Button.jsx';
import Sheet from './Sheet.jsx';

// Asked the first time somebody follows something, never at launch: Android
// prompts only once, so the ask is spent at the moment it explains itself —
// they have just said they want to hear about this team or match.
export default function PushPrimer({ open, onAllow, onDismiss }) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={onDismiss} title={t('app.pushPrimeTitle')}>
      <AppText tone="muted">{t('app.pushPrimeBody')}</AppText>
      <Button onPress={onAllow}>{t('app.pushPrimeAllow')}</Button>
      <Button variant="ghost" onPress={onDismiss}>
        {t('app.pushPrimeLater')}
      </Button>
      <View style={styles.spacer} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  spacer: { height: SPACING.xs },
});
