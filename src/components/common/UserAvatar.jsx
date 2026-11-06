// A small round avatar for a user: their uploaded photo when they have one,
// their first initial on a tinted disc otherwise. Used in the home-screen
// header so a signed-in person sees their own picture instead of the generic
// person icon.
//
// An optional `completion` prop paints a thin coloured ring around the avatar
// and a two-digit percentage badge on the bottom-right while the profile is
// short of 100%. The colour follows `completionTone()` — red up to a third,
// warning up to two thirds, info through the final stretch — so the badge
// doubles as a nudge and never sits on a complete profile.
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/useTheme.js';
import { completionTone } from '../../utils/profileCompletion.js';
import AppText from './AppText.jsx';

function initialOf(name) {
  if (typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed[0].toUpperCase();
}

export default function UserAvatar({
  size = 32,
  avatarUrl,
  name,
  accessibilityLabel,
  completion,
}) {
  const { colors } = useTheme();
  const showRing = typeof completion === 'number' && completion < 100;
  const ringColor = showRing ? colors[completionTone(completion)] : 'transparent';
  const ringWidth = showRing ? Math.max(2, Math.round(size * 0.08)) : 0;
  const outerDim = { width: size, height: size, borderRadius: size / 2 };
  const innerSize = size - ringWidth * 2;
  const innerDim = {
    width: innerSize,
    height: innerSize,
    borderRadius: innerSize / 2,
  };
  const badgeSize = Math.max(14, Math.round(size * 0.46));

  const inner = avatarUrl ? (
    <Image source={{ uri: avatarUrl }} style={[innerDim, styles.inner]} />
  ) : (
    <View
      style={[
        styles.initialWrap,
        innerDim,
        { backgroundColor: colors.brandSoft, borderColor: colors.border },
      ]}
    >
      <AppText
        weight="bold"
        style={{ color: colors.brandStrong, fontSize: Math.round(innerSize * 0.44) }}
      >
        {initialOf(name) || '•'}
      </AppText>
    </View>
  );

  return (
    <View
      style={[
        outerDim,
        styles.outer,
        {
          backgroundColor: ringColor,
          borderColor: colors.border,
          padding: ringWidth,
        },
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      {inner}
      {showRing ? (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: colors[completionTone(completion)],
              borderColor: colors.surface,
            },
          ]}
        >
          <AppText
            weight="bold"
            style={{
              color: colors.onLive ?? '#ffffff',
              fontSize: Math.round(badgeSize * 0.52),
              lineHeight: Math.round(badgeSize * 0.9),
            }}
          >
            {`${completion}`}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

UserAvatar.initialOf = initialOf;

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    overflow: 'visible',
  },
  inner: {},
  initialWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
