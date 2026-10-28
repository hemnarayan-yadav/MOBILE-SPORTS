// Adapted from frontend/src/components/ranking/RankFrame.jsx — the artwork and
// the numbers it carries are the web's; the layout is React Native's.
//
// The podium frame the top three wear: the supplied drawing, with the player's
// photo — or a team's crest — in the ring at its centre. The rank is part of
// the picture, so a row that wears one needs no rank badge beside it.
//
// The artwork says where its own ring is: a 512 canvas whose inner rim is a
// circle of radius 157 centred at (256, 226). Those are the numbers below, so
// nothing is measured by eye and all three frames hold their picture in
// exactly the same place.
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Avatar from '../common/Avatar.jsx';
import goldFrame from '../../assets/rank/rank-1.js';
import silverFrame from '../../assets/rank/rank-2.js';
import bronzeFrame from '../../assets/rank/rank-3.js';

const FRAMES = Object.freeze({ 1: goldFrame, 2: silverFrame, 3: bronzeFrame });

const CANVAS = 512;
const RING_RADIUS = 157;
const RING_CENTRE_Y = 226;
const HOLE = (RING_RADIUS * 2) / CANVAS;
const CENTRE_Y = RING_CENTRE_Y / CANVAS;

export default function RankFrame({ rank, src, name, size = 72, children }) {
  const { t } = useTranslation();
  const frame = FRAMES[rank];
  if (!frame) return null;
  const inner = Math.round(size * HOLE);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('rankings.rankOf', { rank, name })}
    >
      {/* The picture sits under the artwork: the medal at the bottom of the
          frame is meant to overlap it, exactly as the frame was drawn. */}
      <View
        style={[
          styles.inner,
          {
            left: size / 2 - inner / 2,
            top: size * CENTRE_Y - inner / 2,
            width: inner,
            height: inner,
          },
        ]}
      >
        {children ?? <Avatar src={src} name={name} px={inner} ring="none" />}
      </View>
      <SvgXml xml={frame} width={size} height={size} style={styles.art} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  art: { position: 'absolute', left: 0, top: 0 },
});
