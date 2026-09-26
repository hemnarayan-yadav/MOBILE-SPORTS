// News — adapted from NewsList in frontend/src/pages/public/News.jsx.
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { contentApi } from '../../api/content.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import { BackHeader, Card } from '../../components/common/Layout.jsx';
import PagedList from '../../components/common/PagedList.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { IMAGE_WIDTH, cloudinaryImage } from '../../utils/cloudinary.js';
import { formatDate } from '../../utils/format.js';

const PAGE_SIZE = 9;

function PostCard({ post }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/news/${post.slug}`)} accessibilityRole="button">
      <Card style={styles.card}>
        {post.coverUrl ? (
          <Image
            source={{ uri: cloudinaryImage(post.coverUrl, { width: IMAGE_WIDTH.card }) }}
            style={styles.cover}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={styles.body}>
          <AppText variant="small" tone="muted">
            {formatDate(post.publishedAt)}
          </AppText>
          <AppText variant="title" display numberOfLines={2}>
            {post.title}
          </AppText>
          {post.excerpt ? (
            <AppText tone="muted" numberOfLines={3}>
              {post.excerpt}
            </AppText>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

export default function News() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const query = usePagedQuery({
    queryKey: qk.content.news({ limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => contentApi.news({ page, limit: PAGE_SIZE }),
  });
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <PagedList
        query={query}
        items={query.items}
        renderItem={({ item }) => <PostCard post={item} />}
        header={<BackHeader title={t('news.pageTitle')} />}
        emptyTitle={t('news.empty')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: { padding: 0, overflow: 'hidden', gap: 0 },
  cover: { width: '100%', height: 170 },
  body: { padding: SPACING.lg, gap: SPACING.xs },
});
