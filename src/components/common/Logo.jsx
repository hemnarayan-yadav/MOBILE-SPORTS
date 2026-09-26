import { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { KHELSCORE_FULL_SVG } from '../../assets/logo/khelscoreFull.js';
import { useTheme } from '../../theme/useTheme.js';

const ASPECT = 815 / 237;
const HIGHLIGHT = /rgb\(var\(--color-bg\)\)/g;

// The KhelScore wordmark. As on the web, the ink is `currentColor` (the theme's
// text colour) and the highlights take the background colour, so the same
// artwork works in light and dark; the brand orange is the artwork's own.
export default function Logo({ height = 32, title }) {
  const { colors } = useTheme();
  const xml = useMemo(() => KHELSCORE_FULL_SVG.replace(HIGHLIGHT, colors.bg), [colors.bg]);
  return (
    <SvgXml
      xml={xml}
      color={colors.text}
      height={height}
      width={height * ASPECT}
      accessibilityRole="image"
      accessibilityLabel={title}
    />
  );
}
