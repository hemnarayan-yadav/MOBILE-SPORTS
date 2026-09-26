import { apiClient, unwrap } from './client.js';

// What the app must know before it runs (backend modules/mobile): the oldest
// version still allowed to run.
export const mobileApi = {
  config: () => apiClient.get('/mobile/config').then(unwrap),
};
