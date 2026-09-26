// Adapted from Countdown in frontend/src/components/common/Controls.jsx. Only
// this component re-renders every second.
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNow } from '../../hooks/useNow.js';
import { serverNow } from '../../lib/serverClock.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { countdownParts } from '../../utils/format.js';
import AppText from './AppText.jsx';

export default function Countdown({ to }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const now = useNow(1000);
  // Kick-off is a server time, so the countdown runs in server time too.
  const parts = countdownParts(to, serverNow(now));
  const units = ['days', 'hours', 'minutes', 'seconds'];
  return (
    <View style={styles.row} accessibilityRole="timer">
      {units.map((unit) => (
        <View key={unit} style={[styles.cell, { backgroundColor: colors.ink2 }]}>
          <AppText variant="score" tone="onInk">
            {String(parts[unit]).padStart(2, '0')}
          </AppText>
          <AppText variant="small" tone="onInk">
            {t(`common.${unit}`)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.sm },
  cell: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, borderRadius: RADII.md },
});
