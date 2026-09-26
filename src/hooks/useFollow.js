// Ported from frontend/src/hooks/useFollow.js (notices instead of toasts).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { followsApi } from '../api/follows.api.js';
import { qk } from '../api/queryKeys.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { notify } from '../store/noticeStore.js';
import { apiErrorKey } from '../utils/apiErrors.js';

export function useFollow(targetType, targetId) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.status === AUTH_STATUS.AUTHENTICATED);
  const key = qk.follows.status(targetType, targetId);

  const status = useQuery({
    queryKey: key,
    queryFn: () => followsApi.status(targetType, targetId),
    enabled: isAuthenticated && Boolean(targetId),
  });
  const following = Boolean(status.data?.following);

  const toggle = useMutation({
    mutationFn: () =>
      following
        ? followsApi.unfollow(targetType, targetId)
        : followsApi.follow(targetType, targetId),
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      queryClient.invalidateQueries({ queryKey: qk.follows.list });
      notify.success(t(data.following ? 'follow.followed' : 'follow.unfollowed'));
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  return { isAuthenticated, following, toggle: () => toggle.mutate(), isPending: toggle.isPending };
}
