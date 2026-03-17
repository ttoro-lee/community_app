import client from './client'

export const register = (data) => client.post('/users/register', data)
export const login = (data) => client.post('/users/login', data)
export const getMe = () => client.get('/users/me')
export const updateMe = (data) => client.put('/users/me', data)
