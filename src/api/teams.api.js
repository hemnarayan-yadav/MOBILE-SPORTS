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

  addPlayer: (teamId, payload) => apiClient.post(`/teams/${teamId}/players`, payload).then(unwrap),
  // Phone numbers go in the body, never the URL. The API decides whether the
  // number has an account (`match: user | none | unavailable`).
  lookupPhone: (teamId, phone) =>
    apiClient.post(`/teams/${teamId}/players/lookup`, { phone }).then(unwrap),
  addExistingUser: (teamId, payload) =>
    apiClient.post(`/teams/${teamId}/players/existing`, payload).then(unwrap),
  updateMember: (teamId, playerId, changes) =>
    apiClient.patch(`/teams/${teamId}/players/${playerId}`, changes).then(unwrap),
  releasePlayer: (teamId, playerId) =>
    apiClient.delete(`/teams/${teamId}/players/${playerId}`).then(unwrap),
  setPlayingSeven: (teamId, playerIds) =>
    apiClient.put(`/teams/${teamId}/playing-seven`, { playerIds }).then(unwrap),
};

export const playersApi = {
  list: (params) => apiClient.get('/players', { params }).then(unwrap),
  get: (id) => apiClient.get(`/players/${id}`).then(unwrap),
  stats: (id) => apiClient.get(`/players/${id}/stats`).then(unwrap),
  update: (id, changes) => apiClient.patch(`/players/${id}`, changes).then(unwrap),
};
