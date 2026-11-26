import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { env } from '../../config/env.js';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { EVENTS, track } from '../../lib/analytics.js';
import AppText from './AppText.jsx';

/**
 * Shares a page of the website.
 *
 * **Android's own share sheet already lists WhatsApp, Instagram and whatever
 * else is installed**, in the order that person actually uses them. Building
 * our own row of app buttons would be more code, would break whenever an app
 * changed its scheme, and would miss the one they wanted — so this opens the
 * system sheet and gets out of the way.
 *
 * What is shared is the **website** URL, not a deep link: whoever receives it
 * may not have the app, and the web page already carries a title and an image
 * for the preview (the SEO work), so a WhatsApp forward shows a name and a
 * photo rather than a bare link. Anyone who does have the app installed opens
 * it there anyway — App Links already claim these paths.
 */
// `showLabel` writes the word beside the icon, for a page where sharing is the
// main thing to do with it (a tournament poster) rather than a corner action.
export default function ShareButton({ path, title, label, showLabel = false }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const url = `${env.SITE_URL}${path}`;

  const share = () => {
    // What was shared, by kind — "/team/abc" is a team. Never the id, which
    // would say which team somebody follows.
    track(EVENTS.SHARED, { kind: path.split('/')[1] ?? 'page' });
    return Share.share(
      // iOS takes the url separately and the message as the accompanying text;
      // Android has one field, so the url has to be inside the message or it
      // is simply dropped.
      Platform.OS === 'ios'
        ? { url, message: title }
        : { message: title ? `${title}\n${url}` : url },
      { dialogTitle: title },
    ).catch(() => {});
  };

  return (
    <Pressable
      onPress={share}
      accessibilityRole="button"
      accessibilityLabel={label ?? t('common.share')}
      hitSlop={8}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH,
          minWidth: MIN_TOUCH,
          flexDirection: 'row',
          gap: SPACING.sm,
          paddingHorizontal: showLabel ? SPACING.lg : 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: RADII.md,
          backgroundColor: colors.surface2,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name="share-social-outline" size={20} color={colors.text} />
      {showLabel ? <AppText weight="semibold">{label ?? t('common.share')}</AppText> : null}
    </Pressable>
  );
}
