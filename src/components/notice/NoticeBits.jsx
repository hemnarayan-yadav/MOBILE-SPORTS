import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../common/AppText.jsx';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { formatDate } from '../../utils/format.js';

// A tournament somebody else is running, and a Kabaddi headline from a
// publisher. Different things shown in one place, so their cards live together
// and are built to the same proportions.

const POSTER_RATIO = 3 / 4;
// A poster thumbnail sits beside the text rather than above it: on a card two
// of which share the screen, a full-width poster would push everything else
// out of sight.
const THUMB_WIDTH = 72;

// `₹7000` reads as a prize at a glance; the position is the quiet part.
function PrizeRow({ prizes }) {
  const { colors } = useTheme();
  if (!prizes?.length) return null;
  return (
    <View style={styles.prizes}>
      {prizes.slice(0, 3).map((prize) => (
        <View
          key={prize.position}
          style={[styles.prizeChip, { backgroundColor: colors.brandSoft }]}
        >
          <AppText variant="small" weight="semibold" style={{ color: colors.brandStrong }}>
            {prize.prize}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function MetaRow({ icon, children }) {
  const { colors } = useTheme();
  if (!children) return null;
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={colors.muted} />
      <AppText variant="small" tone="muted" numberOfLines={1} style={styles.metaText}>
        {children}
      </AppText>
    </View>
  );
}

/**
 * An announced tournament. The poster is the announcement — village Kabaddi is
 * advertised as a graphic — but it is a thumbnail here so the date, the ground
 * and the prize money are all readable without opening anything. The full
 * poster, uncropped, is on the detail screen.
 */
export function NoticeCard({ notice }) {
  const { colors } = useTheme();
  const router = useRouter();
  const place = [notice.venue, notice.location?.district].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/notice/${notice.id}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        {notice.posterUrl ? (
          <Image
            source={{ uri: notice.posterUrl }}
            style={[styles.thumb, { borderColor: colors.border }]}
            // A poster is a designed graphic; cropping it cuts off the dates
            // and prizes it exists to announce.
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.thumb, styles.thumbBlank, { backgroundColor: colors.brandSoft }]}>
            <Ionicons name="trophy-outline" size={22} color={colors.brandStrong} />
          </View>
        )}

        <View style={styles.body}>
          <AppText weight="semibold" numberOfLines={2}>
            {notice.title}
          </AppText>
          <MetaRow icon="calendar-outline">
            {`${formatDate(notice.startDate)}${notice.startTime ? ` · ${notice.startTime}` : ''}`}
          </MetaRow>
          <MetaRow icon="location-outline">{place}</MetaRow>
          <PrizeRow prizes={notice.prizes} />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * A headline from a publisher.
 *
 * There is no photograph because the feed has none — no `media:content`, no
 * thumbnail, no enclosure — and the article's own image cannot be reached
 * either: Google's link does not redirect server-side and its article id no
 * longer decodes to the publisher's URL. Both were tested. So rather than a
 * scraped, hotlinked thumbnail of somebody else's photograph, the card gives
 * the headline the room a headline deserves, over a quiet brand panel, with
 * the publisher credited underneath. Only the headline is ever ours to show.
 */
export function NewsCard({ item }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const open = () =>
    // An in-app browser rather than leaving the app: the reader comes straight
    // back with the system Back gesture.
    WebBrowser.openBrowserAsync(item.url, {
      toolbarColor: colors.surface,
      controlsColor: colors.brand,
    }).catch(() => {});

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={item.title}
      onPress={open}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.thumb, styles.thumbBlank, { backgroundColor: colors.brandSoft }]}>
          <Ionicons name="newspaper-outline" size={22} color={colors.brandStrong} />
        </View>
        <View style={styles.body}>
          <AppText weight="semibold" numberOfLines={3} style={styles.headline}>
            {item.title}
          </AppText>
          <View style={styles.meta}>
            <AppText variant="small" tone="muted" numberOfLines={1} style={styles.metaText}>
              {item.source ? t('notices.readOnSource', { source: item.source }) : ''}
            </AppText>
            {item.source && item.publishedAt ? (
              <AppText variant="small" tone="muted">
                ·
              </AppText>
            ) : null}
            {item.publishedAt ? (
              <AppText variant="small" tone="muted">
                {formatDate(item.publishedAt)}
              </AppText>
            ) : null}
          </View>
        </View>
        <Ionicons name="open-outline" size={15} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: RADII.xl,
    padding: SPACING.md,
  },
  row: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  thumb: {
    width: THUMB_WIDTH,
    aspectRatio: POSTER_RATIO,
    borderRadius: RADII.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  thumbBlank: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: SPACING.xs },
  headline: { lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  metaText: { flexShrink: 1 },
  prizes: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.xs },
  prizeChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADII.full,
  },
});
