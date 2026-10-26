// Kabaddi headlines from elsewhere, cached by the backend. Read-only: the app
// shows the headline and opens the publisher's own page for the rest.
import { apiClient, unwrap } from './client.js';

export const newsFeedApi = {
  list: (params) => apiClient.get('/news-feed', { params }).then(unwrap),
};
