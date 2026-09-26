// Adapted from frontend/src/components/common/Avatar.jsx.
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/useTheme.js';
import { cloudinaryImage } from '../../utils/cloudinary.js';
import { initials } from '../../utils/format.js';
import AppText from './AppText.jsx';

const SIZES = Object.freeze({ xs: 28, sm: 36, md: 44, lg: 64, xl: 96 });

export default function Avatar({ src, name = '', size = 'md' }) {
  const { colors } = useTheme();
  const px = SIZES[size] ?? SIZES.md;
  const box = { width: px, height: px, borderRadius: px / 2, backgroundColor: colors.surface2 };
  return (
    <View style={[styles.box, box, { borderColor: colors.border }]} accessible={false}>
      {src ? (
        <Image
          source={{ uri: cloudinaryImage(src, { width: px, crop: 'fill' }) }}
          style={{ width: px, height: px }}
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
    borderWidth: StyleSheet.hairlineWidth,
  },
});
