// Adapted from frontend/src/hooks/useNotificationSocket.js: a notification that
// arrives while the app is open is shown as a notice (the app's toast), not as
// a system banner — the notification handler in lib/push/expoPush.js suppresses
// the banner for exactly that reason.
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { qk } from '../api/queryKeys.js';
import { createUserSocket } from '../lib/socket.js';
import { notify } from '../store/noticeStore.js';
import { useAuthStore } from '../store/authStore.js';

// Real-time notification pushes for the signed-in account. The socket follows
// the access token: a refreshed token opens a fresh, authenticated connection.
export function useNotificationSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    if (!accessToken) return undefined;
    const socket = createUserSocket(accessToken);
    socket.on('notification:new', (notification) => {
      queryClient.invalidateQueries({ queryKey: qk.notifications.all });
      notify.info(t(`notif.${notification.type}`, notification.params));
    });
    return () => socket.close();
  }, [accessToken, queryClient, t]);
}
