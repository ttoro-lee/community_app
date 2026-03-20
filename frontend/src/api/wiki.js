import client from './client'

// ── 문서 목록 ─────────────────────────────────────────────────────────────────

export const getWikiDocuments = ({ page = 1, size = 20, search = '' } = {}) =>
  client
    .get('/wiki', { params: { page, size, search: search || undefined } })
    .then((r) => r.data)

// ── 문서 단건 조회 ────────────────────────────────────────────────────────────

export const getWikiDocument = (wikiId) =>
  client.get(`/wiki/${wikiId}`).then((r) => r.data)

// ── 문서 생성 ─────────────────────────────────────────────────────────────────

export const createWikiDocument = (data) =>
  client.post('/wiki', data).then((r) => r.data)

// ── 문서 수정 ─────────────────────────────────────────────────────────────────

export const updateWikiDocument = (wikiId, data) =>
  client.put(`/wiki/${wikiId}`, data).then((r) => r.data)

// ── 수정 이력 목록 ────────────────────────────────────────────────────────────

export const getWikiRevisions = (wikiId) =>
  client.get(`/wiki/${wikiId}/revisions`).then((r) => r.data)

// ── 수정본 단건 ───────────────────────────────────────────────────────────────

export const getWikiRevision = (wikiId, revisionId) =>
  client.get(`/wiki/${wikiId}/revisions/${revisionId}`).then((r) => r.data)

// ── 문서 삭제 (관리자) ────────────────────────────────────────────────────────

export const deleteWikiDocument = (wikiId) =>
  client.delete(`/wiki/${wikiId}`)
