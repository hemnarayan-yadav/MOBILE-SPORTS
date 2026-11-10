import { useMemo } from 'react';
import { SvgXml } from 'react-native-svg';
import { KHELSCORE_FULL_SVG } from '../../assets/logo/khelscoreFull.js';
import { useTheme } from '../../theme/useTheme.js';

const ASPECT = 815 / 237;
const HIGHLIGHT = /rgb\(var\(--color-bg\)\)/g;

// The KhelScore wordmark. As on the web, the ink is `currentColor` (the theme's
// text colour) and the highlights take the background colour, so the same
// artwork works in light and dark; the brand orange is the artwork's own.
//
// `color` and `background` override the theme for a surface that sets its own
// palette rather than following the app's — the scoreboard, which carries its
// own day and night setting because the phone may be dark while the match is
// played in sunlight.
export default function Logo({ height = 32, title, color, background }) {
  const { colors } = useTheme();
  const ink = color ?? colors.text;
  const behind = background ?? colors.bg;
  const xml = useMemo(() => KHELSCORE_FULL_SVG.replace(HIGHLIGHT, behind), [behind]);
  return (
    <SvgXml
      xml={xml}
      color={ink}
      height={height}
      width={height * ASPECT}
      accessibilityRole="image"
      accessibilityLabel={title}
    />
  );
}
