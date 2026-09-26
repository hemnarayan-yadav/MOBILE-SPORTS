// Adapted from mediaApi in frontend/src/api/content.api.js. React Native's
// FormData takes a file as `{ uri, name, type }` rather than a browser File.
import { apiClient, unwrap } from './client.js';

const UPLOAD_TIMEOUT_MS = 120_000;

export const mediaApi = {
  config: () => apiClient.get('/media/config').then(unwrap),
  upload: (kind, file) => {
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);
    return apiClient
      .post('/media/upload', form, {
        timeout: UPLOAD_TIMEOUT_MS,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(unwrap);
  },
};
