import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily } from '../../theme/fonts.js';
import { useTheme } from '../../theme/useTheme.js';

const VARIANTS = Object.freeze({
  body: { fontSize: 15, lineHeight: 21, weight: 'regular' },
  small: { fontSize: 12, lineHeight: 17, weight: 'regular' },
  label: { fontSize: 12, lineHeight: 17, weight: 'semibold' },
  title: { fontSize: 20, lineHeight: 26, weight: 'bold' },
  // Barlow Condensed, for scores and clocks.
  score: { fontSize: 26, lineHeight: 28, weight: 'bold', display: true },
  clock: { fontSize: 14, lineHeight: 18, weight: 'bold', display: true },
});

// Themed text in the app's type scale. Hindi text is set in Noto Sans
// Devanagari (see theme/fonts.js); `tone` picks a token colour.
export default function AppText({ variant = 'body', tone = 'text', weight, style, ...props }) {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontSize, lineHeight, display, ...base } = VARIANTS[variant] ?? VARIANTS.body;
  const family = fontFamily({ language: i18n.language, weight: weight ?? base.weight, display });
  return (
    <Text
      {...props}
      style={[
        { fontFamily: family, fontSize, lineHeight, color: colors[tone] ?? colors.text },
        display && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
