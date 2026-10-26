import { apiClient, unwrap } from './client.js';

// What the app must know before it runs (backend modules/mobile): the oldest
// version still allowed to run.
export const mobileApi = {
  config: () => apiClient.get('/mobile/config').then(unwrap),
  // Every section of the home screen in one response. The server decides what
  // is empty, so the app renders what it is given rather than running the
  // hide-when-empty rule six times over (backend modules/mobile/home.service).
  home: () => apiClient.get('/mobile/home').then(unwrap),
};
