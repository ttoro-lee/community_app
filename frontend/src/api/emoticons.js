import client from './client'

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/** 활성화된 이모티콘 목록 조회 */
export const getEmoticons = () =>
  client.get('/emoticons').then((r) => r.data)

// ─── 관리자 API ───────────────────────────────────────────────────────────────

/** 모든 이모티콘 목록 조회 (비활성 포함) */
export const getAllEmoticons = () =>
  client.get('/emoticons/all').then((r) => r.data)

/** 이모티콘 등록 (관리자) */
export const uploadEmoticon = (formData) =>
  client
    .post('/emoticons', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)

/** 이모티콘 삭제 (관리자) */
export const deleteEmoticon = (id) =>
  client.delete(`/emoticons/${id}`)

/** 이모티콘 활성화/비활성화 토글 (관리자) */
export const toggleEmoticon = (id) =>
  client.patch(`/emoticons/${id}/toggle`).then((r) => r.data)
