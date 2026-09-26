// Adapted from frontend/src/api/teams.api.js — the public reads (the captain's
// squad desk arrives with Phase M5).
import { apiClient, unwrap } from './client.js';

export const teamsApi = {
  list: (params) => apiClient.get('/teams', { params }).then(unwrap),
  get: (id) => apiClient.get(`/teams/${id}`).then(unwrap),
  stats: (id) => apiClient.get(`/teams/${id}/stats`).then(unwrap),
};

export const playersApi = {
  list: (params) => apiClient.get('/players', { params }).then(unwrap),
  get: (id) => apiClient.get(`/players/${id}`).then(unwrap),
  stats: (id) => apiClient.get(`/players/${id}/stats`).then(unwrap),
};
