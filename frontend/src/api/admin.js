import client from './client'

// ─── 통계 ────────────────────────────────────────────────────────────────────

export const getAdminStats = () =>
  client.get('/admin/stats').then((r) => r.data)

// ─── 유저 목록 ────────────────────────────────────────────────────────────────

export const getAdminUsers = ({ page = 1, size = 20, search = '' } = {}) =>
  client
    .get('/admin/users', { params: { page, size, search: search || undefined } })
    .then((r) => r.data)

// ─── 관리자 권한 토글 (슈퍼 관리자 전용) ──────────────────────────────────────

export const toggleAdminRole = (userId, isAdmin) =>
  client.patch(`/admin/users/${userId}/admin`, { is_admin: isAdmin }).then((r) => r.data)

// ─── 활동 정지 ────────────────────────────────────────────────────────────────

export const suspendUser = (userId, days, reason = '') =>
  client
    .post(`/admin/users/${userId}/suspend`, { days, reason })
    .then((r) => r.data)

// ─── 게시글 강제 삭제 ─────────────────────────────────────────────────────────

export const adminDeletePost = (postId) =>
  client.delete(`/admin/posts/${postId}`)

// ─── 댓글 강제 삭제 ───────────────────────────────────────────────────────────

export const adminDeleteComment = (commentId) =>
  client.delete(`/admin/comments/${commentId}`)

// ─── 공지 등록 / 해제 ─────────────────────────────────────────────────────────

export const toggleNotice = (postId, register) =>
  client.patch(`/admin/posts/${postId}/notice`, { register }).then((r) => r.data)

// ─── 베스트 게시글 기준 설정 ──────────────────────────────────────────────────

export const getBestPostThreshold = () =>
  client.get('/admin/settings/best-post-threshold').then((r) => r.data)

export const updateBestPostThreshold = (minLikes) =>
  client
    .patch('/admin/settings/best-post-threshold', { best_post_min_likes: minLikes })
    .then((r) => r.data)

// ─── 게시판 카테고리 관리 ─────────────────────────────────────────────────────

export const getAdminCategories = () =>
  client.get('/admin/categories').then((r) => r.data)

export const createAdminCategory = (data) =>
  client.post('/admin/categories', data).then((r) => r.data)

export const updateAdminCategory = (catId, data) =>
  client.patch(`/admin/categories/${catId}`, data).then((r) => r.data)

export const deleteAdminCategory = (catId) =>
  client.delete(`/admin/categories/${catId}`)
