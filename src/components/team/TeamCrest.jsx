// Adapted from frontend/src/components/team/TeamCrest.jsx: the uploaded logo,
// or a shield monogram from the short name.
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme.js';
import { cloudinaryImage } from '../../utils/cloudinary.js';
import AppText from '../common/AppText.jsx';

const SIZES = Object.freeze({ xs: 28, sm: 36, md: 48, lg: 64, xl: 88 });
// Logos are drawn for a white ground, in both themes (as on the web).
const LOGO_BACKGROUND = '#FFFFFF';

export default function TeamCrest({ team, size = 'md' }) {
  const { colors } = useTheme();
  const px = SIZES[size] ?? SIZES.md;
  if (team?.logoUrl) {
    return (
      <View style={[styles.logo, { width: px, height: px, borderColor: colors.border }]}>
        <Image
          source={{ uri: cloudinaryImage(team.logoUrl, { width: px }) }}
          style={styles.fill}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }
  return (
    <View style={[styles.shield, { width: px, height: px * (56 / 48) }]} accessible={false}>
      <Svg viewBox="0 0 48 56" style={StyleSheet.absoluteFill}>
        <Path d="M24 1 45 8v19c0 14-9 23-21 28C12 50 3 41 3 27V8z" fill={colors.ink} />
        <Path
          d="M24 5 41 11v16c0 11-7 19-17 23C14 46 7 38 7 27V11z"
          fill="none"
          stroke={colors.brand}
          strokeWidth={1.5}
        />
      </Svg>
      <AppText
        weight="bold"
        tone="onInk"
        display
        style={{ fontSize: Math.max(8, px / 4.2) }}
        numberOfLines={1}
      >
        {team?.shortName ?? '?'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: LOGO_BACKGROUND,
    padding: 3,
    overflow: 'hidden',
  },
  fill: { width: '100%', height: '100%' },
  shield: { alignItems: 'center', justifyContent: 'center' },
});
