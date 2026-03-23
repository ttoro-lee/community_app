import client from './client'

export const getArenas = (params) =>
  client.get('/arenas', { params }).then((r) => r.data)

export const getArena = (id) =>
  client.get(`/arenas/${id}`).then((r) => r.data)

export const createArena = (data) =>
  client.post('/arenas', data).then((r) => r.data)

export const acceptArena = (id) =>
  client.post(`/arenas/${id}/accept`).then((r) => r.data)

export const declineArena = (id) =>
  client.post(`/arenas/${id}/decline`).then((r) => r.data)

export const getArenaMessages = (id) =>
  client.get(`/arenas/${id}/messages`).then((r) => r.data)

export const sendArenaMessage = (id, content) =>
  client.post(`/arenas/${id}/messages`, { content }).then((r) => r.data)

export const castVote = (id, voted_for_id) =>
  client.post(`/arenas/${id}/vote`, { voted_for_id }).then((r) => r.data)

export const getVotes = (id) =>
  client.get(`/arenas/${id}/votes`).then((r) => r.data)

export const searchUsers = (q) =>
  client.get('/arenas/users/search', { params: { q } }).then((r) => r.data)

export const deleteArena = (id) =>
  client.delete(`/arenas/${id}`)
