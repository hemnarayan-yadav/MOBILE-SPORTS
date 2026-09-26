// Adapted from frontend/src/components/common/Badge.jsx.
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';

// Background token and text token per tone.
const TONES = Object.freeze({
  neutral: ['surface2', 'muted'],
  brand: ['brandSoft', 'brandStrong'],
  live: ['live', 'onLive'],
  success: ['surface2', 'success'],
  warning: ['surface2', 'warning'],
  danger: ['surface2', 'danger'],
  info: ['surface2', 'info'],
  ink: ['ink', 'onInk'],
});

export default function Badge({ tone = 'neutral', children, style }) {
  const { colors } = useTheme();
  const [bg, fg] = TONES[tone] ?? TONES.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: colors[bg] }, style]}>
      <AppText variant="label" weight="bold" tone={fg} numberOfLines={1}>
        {children}
      </AppText>
    </View>
  );
}

const STATUS_TONES = Object.freeze({
  active: 'success',
  inactive: 'neutral',
  upcoming: 'info',
  live: 'live',
  completed: 'neutral',
  cancelled: 'danger',
  draft: 'neutral',
  registration_open: 'success',
  registration_closed: 'warning',
  ongoing: 'brand',
});

export function StatusBadge({ status, style }) {
  const { t } = useTranslation();
  if (!status) return null;
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} style={style}>
      {t(`status.${status}`)}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: RADII.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
  },
});
