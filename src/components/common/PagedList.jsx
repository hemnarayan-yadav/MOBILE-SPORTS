import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { EmptyState, ErrorState, LoadingState } from './States.jsx';

// A pull-to-refresh list over a query: `items` to render, and either
// usePagedQuery's paging (more pages load as the end comes into view) or a
// plain query. Loading, empty and error states come with it.
export default function PagedList({
  query,
  items,
  renderItem,
  keyExtractor = (item) => item.id,
  header,
  emptyTitle,
  emptyHint,
}) {
  const { colors } = useTheme();
  const [pulling, setPulling] = useState(false);

  const onRefresh = async () => {
    setPulling(true);
    try {
      await query.refetch();
    } finally {
      setPulling(false);
    }
  };

  let empty = <EmptyState title={emptyTitle} hint={emptyHint} />;
  if (query.isPending) empty = <LoadingState />;
  else if (query.isError)
    empty = <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={onRefresh}
          colors={[colors.brand]}
          progressBackgroundColor={colors.surface}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  footer: { paddingVertical: SPACING.lg },
});
