// Ported from frontend/src/hooks/useFollow.js (notices instead of toasts), plus
// the app's own step: the first time somebody follows something, it offers to
// turn notifications on — following is exactly the moment that explains why.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { followsApi } from '../api/follows.api.js';
import { qk } from '../api/queryKeys.js';
import PushPrimer from '../components/common/PushPrimer.jsx';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { notify } from '../store/noticeStore.js';
import { useUiStore } from '../store/uiStore.js';
import { apiErrorKey } from '../utils/apiErrors.js';
import { usePushPermission } from './usePush.js';

export function useFollow(targetType, targetId) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.status === AUTH_STATUS.AUTHENTICATED);
  const pushPrimed = useUiStore((s) => s.pushPrimed);
  const setPushPrimed = useUiStore((s) => s.setPushPrimed);
  const permission = usePushPermission();
  const [priming, setPriming] = useState(false);
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
      // Only after following, only once, and only while the system would still
      // show the prompt.
      if (data.following && !pushPrimed && permission.canAsk) setPriming(true);
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });

  // Whichever way it ends, the offer is not made again.
  const closePrimer = () => {
    setPriming(false);
    setPushPrimed();
  };

  const primer = createElement(PushPrimer, {
    open: priming,
    onAllow: () => {
      closePrimer();
      permission.ask();
    },
    onDismiss: closePrimer,
  });

  return {
    isAuthenticated,
    following,
    toggle: () => toggle.mutate(),
    isPending: toggle.isPending,
    primer,
  };
}
