// Article — adapted from NewsArticle in frontend/src/pages/public/News.jsx.
// Bodies are plain text: blank lines separate paragraphs; no HTML is rendered.
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { contentApi } from '../../api/content.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import Badge from '../../components/common/Badge.jsx';
import { BackHeader } from '../../components/common/Layout.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States.jsx';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { IMAGE_WIDTH, cloudinaryImage } from '../../utils/cloudinary.js';
import { formatDate } from '../../utils/format.js';

export default function Article() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams();
  const query = useQuery({
    queryKey: qk.content.article(slug),
    queryFn: () => contentApi.article(slug),
  });
  const post = query.data;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader />
        {query.isPending ? <LoadingState /> : null}
        {query.isError ? (
          query.error?.status === 404 ? (
            <EmptyState title={t('errors.notFound')} />
          ) : (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          )
        ) : null}
        {post ? (
          <>
            {post.coverUrl ? (
              <Image
                source={{ uri: cloudinaryImage(post.coverUrl, { width: IMAGE_WIDTH.hero }) }}
                style={styles.cover}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            ) : null}
            <AppText variant="heading" accessibilityRole="header">
              {post.title}
            </AppText>
            <AppText variant="small" tone="muted">
              {formatDate(post.publishedAt)}
              {post.author ? ` · ${post.author.name}` : ''}
            </AppText>
            {post.tags.length > 0 ? (
              <View style={styles.tags}>
                {post.tags.map((tag) => (
                  <Badge key={tag}>{`#${tag}`}</Badge>
                ))}
              </View>
            ) : null}
            {post.body.split(/\n\s*\n/).map((paragraph, index) => (
              <AppText key={index} style={styles.paragraph}>
                {paragraph}
              </AppText>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  cover: { width: '100%', height: 200, borderRadius: RADII.xxl },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  paragraph: { fontSize: 17, lineHeight: 26 },
});
