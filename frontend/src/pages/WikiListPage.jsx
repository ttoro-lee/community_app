import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { BookOpen, Search, Plus, Eye, GitBranch, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { getWikiDocuments } from '../api/wiki'
import { useAuth } from '../contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import './WikiListPage.css'

export default function WikiListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery(
    ['wikiDocuments', page, search],
    () => getWikiDocuments({ page, size: 20, search }),
    { keepPreviousData: true }
  )

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const totalPages = data?.pages ?? 1

  return (
    <div className="wiki-list-page fade-in">
      {/* 헤더 */}
      <div className="wiki-list-header">
        <div className="wiki-list-title-wrap">
          <BookOpen size={22} />
          <h1 className="wiki-list-title">위키</h1>
          <span className="wiki-list-count">{data?.total ?? 0}개 문서</span>
        </div>
        {user && (
          <Link to="/wiki/new" className="wiki-new-btn">
            <Plus size={15} />
            새 문서 작성
          </Link>
        )}
      </div>

      <p className="wiki-list-desc">
        누구나 읽고, 회원이라면 누구나 수정할 수 있는 공동 문서입니다.
      </p>

      {/* 검색 */}
      <form className="wiki-search-form" onSubmit={handleSearch}>
        <div className="wiki-search-wrap">
          <Search size={15} className="wiki-search-icon" />
          <input
            className="wiki-search-input"
            type="text"
            placeholder="문서 제목 검색..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <button type="submit" className="wiki-search-btn">검색</button>
      </form>

      {/* 문서 목록 */}
      {isLoading ? (
        <div className="wiki-list-loading">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="wiki-list-skeleton" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="wiki-list-empty">
          <BookOpen size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p>{search ? `"${search}"에 대한 문서가 없습니다.` : '아직 작성된 문서가 없습니다.'}</p>
          {user && (
            <Link to="/wiki/new" className="wiki-new-btn" style={{ marginTop: 12 }}>
              <Plus size={14} /> 첫 번째 문서 작성
            </Link>
          )}
        </div>
      ) : (
        <div className="wiki-list-grid">
          {data.items.map((doc) => (
            <Link key={doc.id} to={`/wiki/${doc.id}`} className="wiki-list-card">
              <div className="wiki-card-top">
                <h2 className="wiki-card-title">{doc.title}</h2>
              </div>
              <div className="wiki-card-meta">
                <span className="wiki-card-meta-item">
                  <Eye size={13} />
                  {doc.view_count.toLocaleString()}
                </span>
                <span className="wiki-card-meta-item">
                  <GitBranch size={13} />
                  {doc.revision_count}번 수정
                </span>
                <span className="wiki-card-meta-item">
                  <Clock size={13} />
                  {formatDistanceToNow(new Date(doc.updated_at || doc.created_at), { addSuffix: true, locale: ko })}
                </span>
              </div>
              <div className="wiki-card-footer">
                <span className="wiki-card-author">
                  작성: {doc.created_by?.nickname ?? '알 수 없음'}
                </span>
                {doc.latest_editor && doc.latest_editor.id !== doc.created_by?.id && (
                  <span className="wiki-card-editor">
                    최근 수정: {doc.latest_editor.nickname}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="wiki-pagination">
          <button className="wiki-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2)
            .map((p) => (
              <button
                key={p}
                className={`wiki-page-btn ${p === page ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
          <button className="wiki-page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
