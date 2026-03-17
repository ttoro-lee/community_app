import client from './client'

export const getPosts = (params) => client.get('/posts', { params })
export const getPost = (id) => client.get(`/posts/${id}`)
export const createPost = (data) => client.post('/posts', data)
export const updatePost = (id, data) => client.put(`/posts/${id}`, data)
export const deletePost = (id) => client.delete(`/posts/${id}`)

export const getComments = (postId) => client.get('/comments', { params: { post_id: postId } })
export const createComment = (data) => client.post('/comments', data)
export const updateComment = (id, data) => client.put(`/comments/${id}`, data)
export const deleteComment = (id) => client.delete(`/comments/${id}`)

export const togglePostLike = (postId) => client.post(`/likes/posts/${postId}`)
export const toggleCommentLike = (commentId) => client.post(`/likes/comments/${commentId}`)

export const getCategories = () => client.get('/categories')

export const getNotices = () => client.get('/posts/notices').then((r) => r.data)

export const getBestPosts = (params) => client.get('/posts/best', { params })

export const uploadImage = (formData) =>
  client.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
