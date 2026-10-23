// Adapted from frontend/src/api/notices.api.js — the public reads, the
// submitter's own calls and reporting. The moderation desk stays on the
// website, so none of those calls are here.
import { apiClient, unwrap } from './client.js';

export const noticesApi = {
  list: (params) => apiClient.get('/tournament-notices', { params }).then(unwrap),
  get: (id) => apiClient.get(`/tournament-notices/${id}`).then(unwrap),
  mine: (params) => apiClient.get('/tournament-notices/mine', { params }).then(unwrap),
  submit: (payload) => apiClient.post('/tournament-notices', payload).then(unwrap),
  remove: (id) => apiClient.delete(`/tournament-notices/${id}`).then(unwrap),
  report: (id, payload) => apiClient.post(`/tournament-notices/${id}/report`, payload).then(unwrap),
};
