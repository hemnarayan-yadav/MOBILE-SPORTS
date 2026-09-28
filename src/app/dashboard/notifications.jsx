// Notifications — adapted from frontend/src/pages/dashboard/Notifications.jsx:
// what happened while the app was closed, newest first, with the unread ones
// marked. Text is rendered here from `type` + `params`, so it is always in the
// reader's language (a push, by contrast, arrives as finished text).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notificationsApi } from '../../api/notifications.api.js';
import { qk } from '../../api/queryKeys.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import { BackHeader, Card, TabStrip } from '../../components/common/Layout.jsx';
import PagedList from '../../components/common/PagedList.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { AUTH_STATUS, useAuthStore } from '../../store/authStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { formatDateTime } from '../../utils/format.js';

const PAGE_SIZE = 20;
const FILTERS = Object.freeze(['all', 'unread']);

function NotificationRow({ notification, onOpen }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onOpen(notification)}
      accessibilityRole="button"
      accessibilityState={{ selected: !notification.read }}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <Card
        style={[
          styles.row,
          !notification.read && { borderColor: colors.brand, backgroundColor: colors.brandSoft },
        ]}
      >
        <View style={styles.flex}>
          <AppText weight={notification.read ? 'regular' : 'semibold'}>
            {t(`notif.${notification.type}`, notification.params)}
          </AppText>
          <AppText variant="small" tone="muted">
            {formatDateTime(notification.createdAt)}
          </AppText>
        </View>
        {notification.read ? null : (
          <View
            style={[styles.dot, { backgroundColor: colors.brand }]}
            accessible
            accessibilityLabel={t('notifications.unread')}
          />
        )}
      </Card>
    </Pressable>
  );
}

export default function Notifications() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const [filter, setFilter] = useState('all');
  const unreadOnly = filter === 'unread';

  const query = usePagedQuery({
    queryKey: qk.notifications.list({ unreadOnly, limit: PAGE_SIZE }),
    fetchPage: ({ page }) =>
      notificationsApi.list({
        page,
        limit: PAGE_SIZE,
        unreadOnly: unreadOnly ? 'true' : undefined,
      }),
    enabled: status === AUTH_STATUS.AUTHENTICATED,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.notifications.all });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });

  if (status === AUTH_STATUS.ANONYMOUS) return <Redirect href="/auth/login" />;

  // Reading one opens what it is about; the page itself carries the link.
  const open = (notification) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.link) router.push(notification.link);
  };

  const unread = query.data?.pages[0]?.unread ?? 0;
  const header = (
    <View style={styles.header}>
      <BackHeader title={t('notifications.title')} />
      <TabStrip
        label={t('notifications.title')}
        value={filter}
        onChange={setFilter}
        tabs={FILTERS.map((id) => ({
          id,
          label: id === 'all' ? t('common.all') : t('notifications.unread'),
        }))}
      />
      <Button
        variant="secondary"
        onPress={() => markAll.mutate()}
        loading={markAll.isPending}
        disabled={!unread}
      >
        {t('notifications.markAllRead')}
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <PagedList
        query={query}
        items={query.items}
        renderItem={({ item }) => <NotificationRow notification={item} onOpen={open} />}
        header={header}
        emptyTitle={t('notifications.empty')}
        emptyHint={t('notifications.emptyHint')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: SPACING.sm, marginBottom: SPACING.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADII.md },
  flex: { flex: 1, gap: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
