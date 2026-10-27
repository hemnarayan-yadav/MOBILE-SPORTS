// Adapted from frontend/src/api/teams.api.js — the public reads and the
// captain's own team (the Super Admin desk stays on the website).
import { apiClient, unwrap } from './client.js';

export const teamsApi = {
  list: (params) => apiClient.get('/teams', { params }).then(unwrap),
  get: (id) => apiClient.get(`/teams/${id}`).then(unwrap),
  stats: (id) => apiClient.get(`/teams/${id}/stats`).then(unwrap),
  create: (payload) => apiClient.post('/teams', payload).then(unwrap),
  update: (id, changes) => apiClient.patch(`/teams/${id}`, changes).then(unwrap),
  setStatus: (id, status) => apiClient.patch(`/teams/${id}/status`, { status }).then(unwrap),
  registrations: (id) => apiClient.get(`/teams/${id}/registrations`).then(unwrap),

  // What the squad has asked for and is waiting on, and withdrawing a request.
  joinRequests: (teamId) => apiClient.get(`/teams/${teamId}/join-requests`).then(unwrap),
  cancelJoinRequest: (teamId, requestId) =>
    apiClient.delete(`/teams/${teamId}/join-requests/${requestId}`).then(unwrap),

  // An account that already exists, named either by its id (picked from
  // POST /users/search) or by its number — exactly one of the two.
  addExistingUser: (teamId, payload) =>
    apiClient.post(`/teams/${teamId}/players/existing`, payload).then(unwrap),
  // A player with no account yet: the account and the squad place are created
  // together. Replaced inviting an unregistered player over WhatsApp. Phone
  // numbers go in the body, never the URL, so they stay out of request logs.
  // The answer says whether an account had to be created (`accountCreated`).
  addDirectPlayer: (teamId, payload) =>
    apiClient.post(`/teams/${teamId}/players/direct`, payload).then(unwrap),
  updateMember: (teamId, playerId, changes) =>
    apiClient.patch(`/teams/${teamId}/players/${playerId}`, changes).then(unwrap),
  // Releasing a player, which is also how a leave request is granted.
  releasePlayer: (teamId, playerId) =>
    apiClient.delete(`/teams/${teamId}/players/${playerId}`).then(unwrap),
  // The squad's own player asking to leave, and changing their mind.
  requestLeave: (teamId) => apiClient.post(`/teams/${teamId}/leave`).then(unwrap),
  cancelLeave: (teamId) => apiClient.delete(`/teams/${teamId}/leave`).then(unwrap),
  // The captain turning a leave request down; the player stays in the squad.
  declineLeave: (teamId, playerId) =>
    apiClient.delete(`/teams/${teamId}/players/${playerId}/leave-request`).then(unwrap),
  setPlayingSeven: (teamId, playerIds) =>
    apiClient.put(`/teams/${teamId}/playing-seven`, { playerIds }).then(unwrap),
};

export const playersApi = {
  list: (params) => apiClient.get('/players', { params }).then(unwrap),
  get: (id) => apiClient.get(`/players/${id}`).then(unwrap),
  stats: (id) => apiClient.get(`/players/${id}/stats`).then(unwrap),
  update: (id, changes) => apiClient.patch(`/players/${id}`, changes).then(unwrap),
};
