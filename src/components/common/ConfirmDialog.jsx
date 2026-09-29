// Ported from frontend/src/components/common/ConfirmDialog.jsx — a sheet with a
// question and two buttons. Used before anything that cannot be undone
// (releasing a player, cancelling an invitation, deactivating a team).
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SPACING } from '../../theme/tokens.js';
import AppText from './AppText.jsx';
import Button from './Button.jsx';
import Sheet from './Sheet.jsx';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <View style={styles.stack}>
        {message ? <AppText tone="muted">{message}</AppText> : null}
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          loading={loading}
          onPress={onConfirm}
        >
          {confirmLabel ?? t('common.confirm')}
        </Button>
        <Button variant="ghost" disabled={loading} onPress={onCancel}>
          {t('common.cancel')}
        </Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.sm },
});
