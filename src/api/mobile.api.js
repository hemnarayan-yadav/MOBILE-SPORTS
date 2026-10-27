import { apiClient, unwrap } from './client.js';

// What the app must know before it runs (backend modules/mobile): the oldest
// version still allowed to run.
export const mobileApi = {
  config: () => apiClient.get('/mobile/config').then(unwrap),
  // Every section of the home screen in one response. The server decides what
  // is empty, so the app renders what it is given rather than running the
  // hide-when-empty rule six times over (backend modules/mobile/home.service).
  // `area` is the signed-in account's own district (backend
  // modules/users/area.service.js); without one the screen is national, as it
  // has always been.
  home: (area) => apiClient.get('/mobile/home', { params: area ?? {} }).then(unwrap),
};
