import { apiClient, unwrap } from './client.js';

// Push devices (backend modules/push). The token identifies this installation;
// the API stores it against the signed-in account and never returns it.
export const pushApi = {
  register: (device) => apiClient.post('/push/devices', device).then(unwrap),
  unregister: (token) => apiClient.post('/push/devices/unregister', { token }).then(unwrap),
};
