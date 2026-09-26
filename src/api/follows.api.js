// Ported from followsApi in frontend/src/api/notifications.api.js (unchanged).
// The notification list arrives with Phase M3.
import { apiClient, unwrap } from './client.js';

export const followsApi = {
  list: () => apiClient.get('/follows').then(unwrap),
  status: (targetType, targetId) =>
    apiClient.get(`/follows/${targetType}/${targetId}`).then(unwrap),
  follow: (targetType, targetId) =>
    apiClient.post('/follows', { targetType, targetId }).then(unwrap),
  unfollow: (targetType, targetId) =>
    apiClient.delete(`/follows/${targetType}/${targetId}`).then(unwrap),
};
