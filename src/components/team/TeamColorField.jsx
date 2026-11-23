// Adapted from frontend/src/components/team/TeamColorField.jsx. The web uses
// the browser's own colour input; a phone has none, so the app offers the
// colour the logo suggested (already in the field) and a row of common jersey
// colours, each dark enough for the band — no picker library.
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from '../common/AppText.jsx';
import Button from '../common/Button.jsx';

export const JERSEY_COLOURS = Object.freeze([
  '#c62828',
  '#7b1f2a',
  '#e65100',
  '#9a6b00',
  '#1b5e20',
  '#00695c',
  '#1565c0',
  '#1a237e',
  '#4a148c',
  '#ad1457',
]);

const SWATCH = 36;

export default function TeamColorField({ value, onChange, error }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const swatches = value && !JERSEY_COLOURS.includes(value) ? [value, ...JERSEY_COLOURS] : JERSEY_COLOURS;
  return (
    <View style={styles.field}>
      <AppText weight="semibold">{t('team.accentColor')}</AppText>
      <View style={styles.swatches} accessibilityRole="radiogroup">
        {swatches.map((colour) => {
          const selected = colour === value;
          return (
            <Pressable
              key={colour}
              onPress={() => onChange(colour)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={colour}
              hitSlop={4}
              style={[
                styles.swatch,
                { backgroundColor: colour, borderColor: selected ? colors.text : 'transparent' },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.row}>
        {value ? (
          <Button variant="ghost" onPress={() => onChange('')}>
            {t('team.accentColorReset')}
          </Button>
        ) : (
          <AppText variant="small" tone="muted">
            {t('team.accentColorNone')}
          </AppText>
        )}
      </View>
      <AppText variant="small" tone="muted">
        {t('team.accentColorHint')}
      </AppText>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityRole="alert">
          {t(error.message)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: RADII.md, borderWidth: 3 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
