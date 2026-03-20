import client from './client'

// ─── 게시글 신고 (유저) ───────────────────────────────────────────────────────

export const reportPost = (data) =>
  client.post('/reports', data).then((r) => r.data)

// ─── 신고 목록 조회 (관리자) ──────────────────────────────────────────────────

export const getReportedPosts = ({ page = 1, size = 20, include_resolved = false } = {}) =>
  client
    .get('/admin/reports', { params: { page, size, include_resolved } })
    .then((r) => r.data)

// ─── 신고 처리 완료 (관리자) ──────────────────────────────────────────────────

export const resolveReports = (postId) =>
  client.patch(`/admin/reports/${postId}/resolve`).then((r) => r.data)
