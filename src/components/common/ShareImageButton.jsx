// Adapted from frontend/src/components/common/ShareImageButton.jsx: the square
// picture of a team, a player or a tournament, drawn by the API
// (backend modules/cards/shareCards.service.js) so the app and the website
// share the very same card.
//
// The phone has no way to hand a remote picture to the share sheet without a
// file module this app's builds may not carry, so the picture is shown in a
// sheet and shared the way the scoreboard's result card is: captured from the
// screen (lib/shareResultCard.js — view-shot and expo-sharing, both loaded on
// demand) and sent through the system share sheet. Nothing is saved to the
// gallery and no storage permission is asked for.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { env } from '../../config/env.js';
import { EVENTS, track } from '../../lib/analytics.js';
import { shareResultCard } from '../../lib/shareResultCard.js';
import { notify } from '../../store/noticeStore.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';
import Button from './Button.jsx';
import Sheet from './Sheet.jsx';

const PREVIEW_MARGIN = 48;
const PREVIEW_MAX = 360;
// The card is a 1080×1350 portrait (backend shareCards.service.js).
const CARD_ASPECT = 1350 / 1080;

export const shareCardUrl = (kind, id, language) =>
  `${String(env.API_URL).replace(/\/+$/, '')}/cards/share/${kind}/${id}.jpg?lang=${language === 'hi' ? 'hi' : 'en'}`;

export default function ShareImageButton({ kind, id, name }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const card = useRef(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const side = Math.min(Dimensions.get('window').width - PREVIEW_MARGIN, PREVIEW_MAX);
  const label = t('common.shareImage', { name });

  const close = () => {
    setOpen(false);
    setLoaded(false);
    setFailed(false);
  };

  const share = async () => {
    setSharing(true);
    // What was shared, by kind — never the id (ShareButton's rule).
    track(EVENTS.SHARED, { kind, as: 'image' });
    const shared = await shareResultCard(card, name);
    setSharing(false);
    if (!shared) notify.error(t('common.imageShareFailed'));
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        style={({ pressed }) => [styles.icon, { backgroundColor: colors.surface2, opacity: pressed ? 0.85 : 1 }]}
      >
        <Ionicons name="image-outline" size={20} color={colors.text} />
      </Pressable>
      <Sheet open={open} onClose={close} title={label}>
        <View style={styles.body}>
          <View ref={card} collapsable={false} style={[styles.card, { width: side, height: Math.round(side * CARD_ASPECT), backgroundColor: colors.ink }]}>
            {open ? (
              <Image
                source={{ uri: shareCardUrl(kind, id, i18n.language) }}
                style={styles.image}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
                accessibilityIgnoresInvertColors
                accessibilityLabel={name}
                testID="share-card-image"
              />
            ) : null}
            {!loaded && !failed ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.onInk} /> : null}
          </View>
          {failed ? (
            <AppText tone="danger" accessibilityLiveRegion="polite">
              {t('common.imageShareFailed')}
            </AppText>
          ) : null}
          <Button onPress={share} disabled={!loaded} loading={sharing}>
            {t('common.share')}
          </Button>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.md,
  },
  body: { alignItems: 'center', gap: SPACING.md },
  card: { borderRadius: RADII.md, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
