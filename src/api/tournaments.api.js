// Adapted from frontend/src/api/tournaments.api.js — the public reads and the
// captain's own entry and withdrawal (the organiser desk stays on the website).
import { apiClient, unwrap } from './client.js';

export const tournamentsApi = {
  list: (params) => apiClient.get('/tournaments', { params }).then(unwrap),
  get: (id) => apiClient.get(`/tournaments/${id}`).then(unwrap),
  teams: (id, params) => apiClient.get(`/tournaments/${id}/teams`, { params }).then(unwrap),
  stats: (id) => apiClient.get(`/tournaments/${id}/stats`).then(unwrap),
  register: (id) => apiClient.post(`/tournaments/${id}/register-team`).then(unwrap),
  withdraw: (id) => apiClient.delete(`/tournaments/${id}/register-team`).then(unwrap),
};
