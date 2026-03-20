import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import { getWikiDocument, deleteWikiDocument } from '../api/wiki'
import { useAuth } from '../contexts/AuthContext'
import WikiContentRenderer from '../components/wiki/WikiContentRenderer'
import {
  BookOpen, Pencil, History, ArrowLeft, Eye, GitBranch,
  ShieldAlert, Clock, User, List,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import './WikiDetailPage.css'

export default function WikiDetailPage() {
  const { wikiId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: doc, isLoading } = useQuery(
    ['wikiDocument', wikiId],
    () => getWikiDocument(wikiId),
    { staleTime: 30_000 }
  )

  const handleDelete = async () => {
    if (!confirm('이 위키 문서를 삭제할까요? 모든 수정 이력도 함께 삭제됩니다.')) return
    try {
      await deleteWikiDocument(wikiId)
      toast.success('문서가 삭제되었습니다.')
      queryClient.invalidateQueries('wikiDocuments')
      navigate('/wiki')
    } catch (err) {
      toast.error(err.response?.data?.detail || '삭제 중 오류가 발생했습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="wiki-detail-loading">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="wiki-skeleton-line" style={{ height: i === 0 ? 28 : 14, width: i === 0 ? '60%' : '100%' }} />
        ))}
      </div>
    )
  }

  if (!doc) return (
    <div className="wiki-empty-state">
      <p>문서를 찾을 수 없습니다.</p>
      <Link to="/wiki" className="wiki-back-link">위키 목록으로</Link>
    </div>
  )

  const sections = doc.latest_revision?.sections ?? []
  const hasToc = sections.some((s) => s.heading)
  const timeAgo = formatDistanceToNow(new Date(doc.updated_at || doc.created_at), { addSuffix: true, locale: ko })
  const fullDate = format(new Date(doc.updated_at || doc.created_at), 'yyyy년 MM월 dd일 HH:mm')
  const latestEditor = doc.latest_revision?.editor

  return (
    <div className="wiki-detail-page fade-in">
      {/* 뒤로가기 */}
      <button className="wiki-back-btn" onClick={() => navigate('/wiki')}>
        <ArrowLeft size={15} /> 위키 목록
      </button>

      <article className="wiki-article">

        {/* ── 헤더: 제목·메타(좌) + 액션 버튼(우) ── */}
        <div className="wiki-doc-header">
          <div className="wiki-doc-header-left">
            <div className="wiki-doc-title-row">
              <BookOpen size={20} className="wiki-doc-icon" />
              <h1 className="wiki-doc-title">{doc.title}</h1>
            </div>
            <div className="wiki-doc-meta">
              <span className="wiki-meta-item">
                <Eye size={13} /> {doc.view_count.toLocaleString()}
              </span>
              <span className="wiki-meta-item">
                <GitBranch size={13} /> {doc.revision_count}번 수정
              </span>
              <span className="wiki-meta-item" title={fullDate}>
                <Clock size={13} /> {timeAgo}
              </span>
              {latestEditor && (
                <span className="wiki-meta-item">
                  <User size={13} /> {latestEditor.nickname}
                </span>
              )}
            </div>
          </div>

          {/* 액션 버튼 — 우측 상단 */}
          <div className="wiki-doc-actions">
            {user && (
              <Link to={`/wiki/${wikiId}/edit`} className="wiki-action-btn wiki-edit-btn">
                <Pencil size={13} /> 수정
              </Link>
            )}
            <Link to={`/wiki/${wikiId}/history`} className="wiki-action-btn wiki-history-btn">
              <History size={13} /> 수정 이력
            </Link>
            {user?.is_admin && (
              <button className="wiki-action-btn wiki-delete-btn" onClick={handleDelete}>
                <ShieldAlert size={13} /> 삭제
              </button>
            )}
          </div>
        </div>

        <div className="wiki-divider" />

        {/* ── 본문 영역: 목차(좌) | 내용(우) ── */}
        <div className={`wiki-doc-layout ${hasToc ? 'has-toc' : ''}`}>

          {/* 목차 — 좌측 고정 */}
          {hasToc && (
            <nav className="wiki-toc">
              <div className="wiki-toc-title">
                <List size={13} /> 목차
              </div>
              <ol className="wiki-toc-list">
                {sections
                  .filter((s) => s.heading)
                  .map((s, i) => (
                    <li key={i}>
                      <a href={`#section-${sections.indexOf(s)}`} className="wiki-toc-link">
                        {s.heading}
                      </a>
                    </li>
                  ))}
              </ol>
            </nav>
          )}

          {/* 본문 */}
          <div className="wiki-doc-body">
            <WikiContentRenderer sections={sections} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="wiki-doc-footer">
          <div className="wiki-footer-info">
            <span>최초 작성: <strong>{doc.created_by?.nickname ?? '알 수 없음'}</strong></span>
            <span>작성일: {format(new Date(doc.created_at), 'yyyy.MM.dd')}</span>
          </div>
          {user && (
            <Link to={`/wiki/${wikiId}/edit`} className="wiki-action-btn wiki-edit-btn">
              <Pencil size={13} /> 이 문서 수정하기
            </Link>
          )}
        </div>
      </article>
    </div>
  )
}
