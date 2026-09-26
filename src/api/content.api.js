// Adapted from contentApi in frontend/src/api/content.api.js — news only; the
// other public pages open on the website (app/(tabs)/more.jsx).
import { apiClient, unwrap } from './client.js';

export const contentApi = {
  news: (params) => apiClient.get('/news', { params }).then(unwrap),
  article: (slug) => apiClient.get(`/news/${slug}`).then(unwrap),
};
