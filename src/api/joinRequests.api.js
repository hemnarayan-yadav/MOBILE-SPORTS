// Ported from frontend/src/api/joinRequests.api.js.
import { apiClient, unwrap } from './client.js';

// Join requests — a captain asking a player into their squad.
//
// For the player who was asked: their own open requests, and the two answers.
// A request names the only account that may answer it, so there is nothing to
// prove here beyond being signed in as that account.
export const joinRequestsApi = {
  mine: () => apiClient.get('/join-requests/mine').then(unwrap),
  accept: (requestId) => apiClient.post(`/join-requests/${requestId}/accept`).then(unwrap),
  reject: (requestId) => apiClient.post(`/join-requests/${requestId}/reject`).then(unwrap),
};
