// Adapted from frontend/src/components/common/Avatar.jsx.
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/useTheme.js';
import { sizedImage } from '../../utils/image.js';
import { initials } from '../../utils/format.js';
import AppText from './AppText.jsx';

const SIZES = Object.freeze({ xs: 28, sm: 36, md: 44, lg: 64, xl: 96 });

// The rim around the picture. `highlight` marks somebody out from the players
// around them — the leaderboard's 4th to 10th wear it — and `none` is for a
// picture that sits inside artwork of its own (the podium's crown frames).
// `px` overrides the size where one is measured from that artwork.
export default function Avatar({ src, name = '', size = 'md', ring = 'default', px: exactPx }) {
  const { colors } = useTheme();
  const px = exactPx ?? SIZES[size] ?? SIZES.md;
  const box = { width: px, height: px, borderRadius: px / 2, backgroundColor: colors.surface2 };
  const rim =
    ring === 'none'
      ? { borderWidth: 0 }
      : { borderWidth: ring === 'highlight' ? 2 : StyleSheet.hairlineWidth, borderColor: ring === 'highlight' ? colors.brand : colors.border };
  return (
    <View style={[styles.box, box, rim]} accessible={false}>
      {src ? (
        <Image
          source={{ uri: sizedImage(src, { width: px }) }}
          style={{ width: px, height: px }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <AppText weight="semibold" tone="muted" style={{ fontSize: Math.max(10, px / 3) }}>
          {initials(name)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
