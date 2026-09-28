// Ported from frontend/src/api/notifications.api.js (the notification half;
// follows live in follows.api.js). `GET /notifications/unread-count` is not
// ported: the list already answers with `unread`, which is all the screen shows.
import { apiClient, unwrap } from './client.js';

export const notificationsApi = {
  list: (params) => apiClient.get('/notifications', { params }).then(unwrap),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => apiClient.patch('/notifications/read-all').then(unwrap),
};
