// Adapted from frontend/src/api/notices.api.js — the public reads, the
// submitter's own calls (reading a poster among them) and reporting. The
// moderation desk stays on the website, so none of those calls are here.
import { apiClient, unwrap } from './client.js';

export const noticesApi = {
  // What this server can do for the form — whether a poster can be read.
  config: () => apiClient.get('/tournament-notices/config').then(unwrap),
  list: (params) => apiClient.get('/tournament-notices', { params }).then(unwrap),
  get: (id) => apiClient.get(`/tournament-notices/${id}`).then(unwrap),
  mine: (params) => apiClient.get('/tournament-notices/mine', { params }).then(unwrap),
  submit: (payload) => apiClient.post('/tournament-notices', payload).then(unwrap),
  remove: (id) => apiClient.delete(`/tournament-notices/${id}`).then(unwrap),
  report: (id, payload) => apiClient.post(`/tournament-notices/${id}/report`, payload).then(unwrap),
  // Reads an uploaded poster into a draft. Takes the asset's id, never its
  // address, so the server only ever fetches what it stored itself.
  extractPoster: (assetId) =>
    apiClient.post('/tournament-notices/extract-poster', { assetId }).then(unwrap),
};
