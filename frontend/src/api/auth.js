import client from './client'

export const register = (data) => client.post('/users/register', data)
export const login = (data) => client.post('/users/login', data)
export const checkUsername = (username) => client.get('/users/check-username', { params: { username } })
export const getMe = () => client.get('/users/me')
export const updateMe = (data) => client.put('/users/me', data)
export const changePassword = (data) => client.post('/users/me/change-password', data)
export const deleteAccount = (data) => client.delete('/users/me', { data })
export const getMyPosts = (params) => client.get('/users/me/posts', { params })
export const getMyComments = (params) => client.get('/users/me/comments', { params })
export const getApiKey = () => client.get('/users/me/api-key')
export const generateApiKey = () => client.post('/users/me/api-key')
