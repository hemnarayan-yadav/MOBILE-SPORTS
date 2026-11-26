// Adapted from frontend/src/components/common/PhotoZoom.jsx. A profile picture
// that opens large when tapped, the way WhatsApp and Instagram open one: the
// picture over a dark screen with the name under it, closed by the ✕, by
// tapping outside it, or by the back button. Without a picture (initials only)
// there is nothing to open, so the child renders as it is.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { MIN_TOUCH, SPACING } from '../../theme/tokens.js';
import { sizedImage } from '../../utils/image.js';
import AppText from './AppText.jsx';

// Wide enough for a phone held upright, without asking for the original upload.
const VIEW_WIDTH = 1080;
// How much of the screen the photo may take, leaving room for the name and ✕.
const WIDTH_SHARE = 0.92;
const HEIGHT_SHARE = 0.7;
const BACKDROP = 'rgba(0, 0, 0, 0.92)';
const ON_BACKDROP = '#ffffff';

export default function PhotoZoom({ src, name = '', children }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  if (!src) return children;

  const close = () => setOpen(false);
  const frame = { width: width * WIDTH_SHARE, height: height * HEIGHT_SHARE };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('common.viewPhoto', { name })}
      >
        {children}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('common.close')}>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={styles.close}
            hitSlop={SPACING.sm}
          >
            <Ionicons name="close" size={26} color={ON_BACKDROP} />
          </Pressable>
          {/* Tapping the photo itself keeps it open; only outside closes. */}
          <Pressable onPress={() => {}} accessible={false}>
            <Image
              source={{ uri: sizedImage(src, { width: VIEW_WIDTH }) }}
              style={frame}
              resizeMode="contain"
              accessibilityLabel={name}
              accessibilityIgnoresInvertColors
            />
          </Pressable>
          {name ? (
            <View style={styles.caption}>
              <AppText weight="semibold" style={styles.name}>
                {name}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BACKDROP,
    padding: SPACING.lg,
  },
  close: {
    position: 'absolute',
    top: SPACING.xl,
    right: SPACING.md,
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { marginTop: SPACING.md },
  name: { color: ON_BACKDROP, textAlign: 'center' },
});
