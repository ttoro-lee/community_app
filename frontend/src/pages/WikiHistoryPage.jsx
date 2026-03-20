import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { getWikiRevisions, getWikiRevision, getWikiDocument } from '../api/wiki'
import WikiContentRenderer from '../components/wiki/WikiContentRenderer'
import {
  ArrowLeft, History, GitBranch, User, Clock,
  ChevronDown, ChevronUp, Eye, GitCompare,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import './WikiHistoryPage.css'

// ── diff 유틸: 단락 변경 계산 ─────────────────────────────────────────────────

function computeDiff(oldSections = [], newSections = []) {
  const results = []
  const maxLen = Math.max(oldSections.length, newSections.length)
  for (let i = 0; i < maxLen; i++) {
    const o = oldSections[i]
    const n = newSections[i]
    if (!o) {
      results.push({ type: 'added', section: n, index: i })
    } else if (!n) {
      results.push({ type: 'removed', section: o, index: i })
    } else if (o.heading !== n.heading || o.content !== n.content) {
      results.push({ type: 'changed', oldSection: o, newSection: n, index: i })
    } else {
      results.push({ type: 'unchanged', section: n, index: i })
    }
  }
  return results
}

// ── 수정본 상세 패널 ──────────────────────────────────────────────────────────

function RevisionDetail({ wikiId, revisionId, prevRevisionId }) {
  const { data: rev } = useQuery(
    ['wikiRevision', wikiId, revisionId],
    () => getWikiRevision(wikiId, revisionId),
    { staleTime: 60_000 }
  )

  const { data: prevRev } = useQuery(
    ['wikiRevision', wikiId, prevRevisionId],
    () => getWikiRevision(wikiId, prevRevisionId),
    { enabled: !!prevRevisionId, staleTime: 60_000 }
  )

  const [showDiff, setShowDiff] = useState(true)

  if (!rev) return <div className="wiki-rev-loading">불러오는 중...</div>

  const diffs = computeDiff(prevRev?.sections ?? [], rev.sections ?? [])
  const changedCount = diffs.filter((d) => d.type !== 'unchanged').length

  return (
    <div className="wiki-rev-detail">
      {/* 메타 */}
      <div className="wiki-rev-meta-bar">
        <span className="wiki-rev-meta-item">
          <User size={13} /> {rev.editor?.nickname ?? '알 수 없음'}
          <span className="wiki-rev-username">(@{rev.editor?.username ?? '-'})</span>
        </span>
        <span className="wiki-rev-meta-item">
          <Clock size={13} /> {format(new Date(rev.created_at), 'yyyy.MM.dd HH:mm')}
        </span>
        {rev.edit_summary && (
          <span className="wiki-rev-summary">
            <GitBranch size={12} /> {rev.edit_summary}
          </span>
        )}
      </div>

      {prevRevisionId ? (
        <>
          {/* 변경 내역 */}
          <div className="wiki-diff-header">
            <button
              className="wiki-diff-toggle"
              onClick={() => setShowDiff((v) => !v)}
            >
              <GitCompare size={14} />
              변경 내역 ({changedCount}개 단락)
              {showDiff ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {showDiff && (
            <div className="wiki-diff-list">
              {diffs.map((diff, i) => {
                if (diff.type === 'unchanged') return null

                return (
                  <div key={i} className={`wiki-diff-item wiki-diff-${diff.type}`}>
                    <div className="wiki-diff-label">
                      {diff.type === 'added' && '+ 단락 추가'}
                      {diff.type === 'removed' && '− 단락 삭제'}
                      {diff.type === 'changed' && '~ 단락 수정'}
                      <span className="wiki-diff-index">#{i + 1}</span>
                    </div>

                    {diff.type === 'changed' && (
                      <div className="wiki-diff-columns">
                        <div className="wiki-diff-col wiki-diff-old">
                          <div className="wiki-diff-col-label">이전</div>
                          {diff.oldSection.heading && (
                            <div className="wiki-diff-heading">
                              <del>{diff.oldSection.heading}</del>
                            </div>
                          )}
                          <pre className="wiki-diff-content">{diff.oldSection.content || '(내용 없음)'}</pre>
                        </div>
                        <div className="wiki-diff-col wiki-diff-new">
                          <div className="wiki-diff-col-label">변경 후</div>
                          {diff.newSection.heading && (
                            <div className="wiki-diff-heading">{diff.newSection.heading}</div>
                          )}
                          <pre className="wiki-diff-content">{diff.newSection.content || '(내용 없음)'}</pre>
                        </div>
                      </div>
                    )}

                    {diff.type === 'added' && (
                      <div className="wiki-diff-col wiki-diff-new" style={{ width: '100%' }}>
                        {diff.section.heading && (
                          <div className="wiki-diff-heading">{diff.section.heading}</div>
                        )}
                        <pre className="wiki-diff-content">{diff.section.content || '(내용 없음)'}</pre>
                      </div>
                    )}

                    {diff.type === 'removed' && (
                      <div className="wiki-diff-col wiki-diff-old" style={{ width: '100%' }}>
                        {diff.section.heading && (
                          <div className="wiki-diff-heading"><del>{diff.section.heading}</del></div>
                        )}
                        <pre className="wiki-diff-content">{diff.section.content || '(내용 없음)'}</pre>
                      </div>
                    )}
                  </div>
                )
              })}
              {changedCount === 0 && (
                <p className="wiki-diff-none">변경된 내용이 없습니다.</p>
              )}
            </div>
          )}

          {/* 전체 내용 보기 */}
          <details className="wiki-rev-full-content">
            <summary className="wiki-rev-full-summary">
              <Eye size={13} /> 이 버전 전체 내용 보기
            </summary>
            <div className="wiki-rev-full-body">
              <WikiContentRenderer sections={rev.sections ?? []} />
            </div>
          </details>
        </>
      ) : (
        /* 최초 버전 */
        <div>
          <p className="wiki-rev-initial-label">최초 작성 버전</p>
          <WikiContentRenderer sections={rev.sections ?? []} />
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function WikiHistoryPage() {
  const { wikiId } = useParams()
  const navigate = useNavigate()
  const [expandedRevId, setExpandedRevId] = useState(null)

  const { data: doc } = useQuery(
    ['wikiDocument', wikiId],
    () => getWikiDocument(wikiId),
    { staleTime: 30_000 }
  )

  const { data: revisions = [], isLoading } = useQuery(
    ['wikiRevisions', wikiId],
    () => getWikiRevisions(wikiId),
    { staleTime: 30_000 }
  )

  return (
    <div className="wiki-history-page fade-in">
      {/* 뒤로가기 */}
      <button className="wiki-back-btn2" onClick={() => navigate(`/wiki/${wikiId}`)}>
        <ArrowLeft size={15} /> 문서로 돌아가기
      </button>

      <div className="wiki-history-header">
        <History size={18} />
        <div>
          <h1 className="wiki-history-title">수정 이력</h1>
          {doc && (
            <Link to={`/wiki/${wikiId}`} className="wiki-history-doc-title">
              {doc.title}
            </Link>
          )}
        </div>
        <span className="wiki-history-count">{revisions.length}번 수정</span>
      </div>

      {isLoading ? (
        <div className="wiki-history-loading">불러오는 중...</div>
      ) : revisions.length === 0 ? (
        <p className="wiki-history-empty">수정 이력이 없습니다.</p>
      ) : (
        <div className="wiki-history-list">
          {revisions.map((rev, idx) => {
            const prevRev = revisions[idx + 1]
            const isExpanded = expandedRevId === rev.id
            const timeAgo = formatDistanceToNow(new Date(rev.created_at), { addSuffix: true, locale: ko })
            const isLatest = idx === 0

            return (
              <div key={rev.id} className={`wiki-history-item ${isLatest ? 'wiki-history-latest' : ''}`}>
                {/* 타임라인 점 */}
                <div className="wiki-timeline-dot" />

                <div className="wiki-history-card">
                  <div
                    className="wiki-history-card-header"
                    onClick={() => setExpandedRevId(isExpanded ? null : rev.id)}
                  >
                    <div className="wiki-history-left">
                      <span className="wiki-rev-num">rev.{revisions.length - idx}</span>
                      {isLatest && <span className="wiki-latest-badge">최신</span>}
                      <span className="wiki-history-editor">
                        <User size={12} /> {rev.editor?.nickname ?? '알 수 없음'}
                      </span>
                      <span className="wiki-history-time" title={format(new Date(rev.created_at), 'yyyy.MM.dd HH:mm')}>
                        <Clock size={12} /> {timeAgo}
                      </span>
                      {rev.edit_summary && (
                        <span className="wiki-history-summary">{rev.edit_summary}</span>
                      )}
                    </div>
                    <button className="wiki-history-expand-btn">
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="wiki-history-card-body">
                      <RevisionDetail
                        wikiId={wikiId}
                        revisionId={rev.id}
                        prevRevisionId={prevRev?.id ?? null}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
