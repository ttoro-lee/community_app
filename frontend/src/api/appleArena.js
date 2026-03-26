import client from './client'

export const getAppleArenaRooms = (params) =>
  client.get('/apple-arena/rooms', { params })

export const getAppleArenaRoom = (roomId) =>
  client.get(`/apple-arena/rooms/${roomId}`)

export const createAppleArenaRoom = () =>
  client.post('/apple-arena/rooms')

export const deleteAppleArenaRoom = (roomId) =>
  client.delete(`/apple-arena/rooms/${roomId}`)
