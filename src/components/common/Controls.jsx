import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';

// Each language is labelled in itself, as on the web (Controls.jsx).
const LANGUAGE_LABELS = Object.freeze({ en: 'EN', hi: 'हिं' });

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { current, supported, change } = useLanguage();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('common.language')}
      style={[styles.group, { backgroundColor: colors.surface2 }]}
    >
      {supported.map((lng) => {
        const active = current === lng;
        return (
          <Pressable
            key={lng}
            onPress={() => change(lng)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLanguage={lng}
            style={[styles.segment, active && { backgroundColor: colors.surface }]}
          >
            <AppText variant="label" tone={active ? 'text' : 'muted'} weight="bold">
              {LANGUAGE_LABELS[lng]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// Cycles light → dark → system, like the web's theme button. It names the
// current theme in words rather than relying on an icon.
export function ThemeToggle() {
  const { t } = useTranslation();
  const { colors, theme, cycle } = useTheme();
  const label = t(`theme.${theme}`);
  return (
    <Pressable
      onPress={cycle}
      accessibilityRole="button"
      accessibilityLabel={t('theme.toggle', { theme: label })}
      style={[styles.group, styles.segment, { backgroundColor: colors.surface2 }]}
    >
      <AppText variant="label" weight="bold">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderRadius: RADII.md, padding: 2 },
  segment: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
  },
});
