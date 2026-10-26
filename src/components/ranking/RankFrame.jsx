// Adapted from frontend/src/components/ranking/RankFrame.jsx — the artwork and
// the numbers measured from it are the web's; the layout is React Native's.
//
// The podium frame the top three wear on a leaderboard: the supplied artwork,
// with the player's photo in the ring at its centre. The rank is part of the
// picture — each frame carries its own numeral on the shield — so a row that
// wears one needs no rank badge beside it.
//
// The three frames are not drawn identically, so the ring each one leaves is
// measured from the artwork rather than guessed: `hole` is the photo's diameter
// and `top` its centre, both as a fraction of the frame. Swapping the artwork
// means measuring it again.
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import Avatar from '../common/Avatar.jsx';
import goldFrame from '../../assets/rank/rank-1.webp';
import silverFrame from '../../assets/rank/rank-2.webp';
import bronzeFrame from '../../assets/rank/rank-3.webp';

const FRAMES = Object.freeze({
  1: { src: goldFrame, hole: 0.536, top: 0.529 },
  2: { src: silverFrame, hole: 0.505, top: 0.518 },
  3: { src: bronzeFrame, hole: 0.516, top: 0.526 },
});

export default function RankFrame({ rank, src, name, size = 72 }) {
  const { t } = useTranslation();
  const frame = FRAMES[rank];
  if (!frame) return null;
  const photo = Math.round(size * frame.hole);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('rankings.rankOf', { rank, name })}
    >
      {/* The photo sits under the artwork: the shield at the bottom of the
          frame is meant to overlap it, exactly as the frame was drawn. */}
      <View
        style={[
          styles.photo,
          { left: size * 0.497 - photo / 2, top: size * frame.top - photo / 2 },
        ]}
      >
        <Avatar src={src} name={name} px={photo} ring="none" />
      </View>
      <Image
        source={frame.src}
        style={[styles.art, { width: size, height: size }]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { position: 'absolute' },
  art: { position: 'absolute', left: 0, top: 0 },
});
