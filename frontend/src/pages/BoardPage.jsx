import { useState } from 'react'
import { useQuery } from 'react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPosts, getCategories, getBestPosts } from '../api/posts'
import PostCard from '../components/board/PostCard'
import NoticeBar from '../components/board/NoticeBar'
import { Search, PenSquare, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './BoardPage.css'

const BEST_SLUG = 'best'

export default function BoardPage() {
  const { categorySlug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const isBest = categorySlug === BEST_SLUG

  const { data: categories = [] } = useQuery('categories', () =>
    getCategories().then((r) => r.data)
  )

  const currentCategory = isBest ? null : categories.find((c) => c.slug === categorySlug)

  const { data, isLoading } = useQuery(
    ['posts', page, pageSize, categorySlug, search],
    () => {
      if (isBest) {
        return getBestPosts({ page, size: pageSize }).then((r) => r.data)
      }
      return getPosts({
        page,
        size: pageSize,
        category_id: currentCategory?.id,
        search: search || undefined,
      }).then((r) => r.data)
    },
    { keepPreviousData: true }
  )

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handlePageSize = (size) => {
    setPageSize(size)
    setPage(1)
  }

  const pageTitle = isBest
    ? '🏆 베스트 게시글'
    : currentCategory
    ? `${currentCategory.icon} ${currentCategory.name}`
    : '전체 게시글'

  return (
    <div className="board-page fade-in">
      <div className="board-header">
        <h1 className="board-title">{pageTitle}</h1>
        {user && !isBest && (!currentCategory?.admin_only || user.is_admin) && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/write')}
          >
            <PenSquare size={14} />
            글쓰기
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="category-tabs">
        <Link
          to="/board"
          className={`cat-tab ${!categorySlug ? 'active' : ''}`}
          onClick={() => setPage(1)}
        >
          전체
        </Link>
        <Link
          to="/board/best"
          className={`cat-tab best-tab ${isBest ? 'active' : ''}`}
          onClick={() => setPage(1)}
        >
          <Trophy size={13} style={{ marginRight: 3, verticalAlign: 'middle' }} />
          베스트
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/board/${cat.slug}`}
            className={`cat-tab ${categorySlug === cat.slug ? 'active' : ''}`}
            onClick={() => setPage(1)}
          >
            {cat.icon} {cat.name}
          </Link>
        ))}
      </div>

      {/* 공지사항 배너 — 공지사항 카테고리, 베스트 페이지에서는 숨김 */}
      {!currentCategory?.admin_only && !isBest && <NoticeBar />}

      {/* 베스트 게시글 안내 문구 */}
      {isBest && (
        <div className="best-notice">
          <Trophy size={14} />
          좋아요를 일정 수 이상 받은 인기 게시글 모음입니다.
        </div>
      )}

      {/* List Controls: 검색 + 개수 선택 */}
      <div className="list-controls">
        {!isBest ? (
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrap">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">검색</button>
          </form>
        ) : (
          <div />
        )}
        <div className="page-size-selector">
          {[5, 10, 20].map((size) => (
            <button
              key={size}
              className={`page-size-btn ${pageSize === size ? 'active' : ''}`}
              onClick={() => handlePageSize(size)}
            >
              {size}개
            </button>
          ))}
        </div>
      </div>

      {/* Post List */}
      <div className="posts-list">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-card" style={{ height: 110 }} />
          ))
        ) : data?.items?.length ? (
          data.items.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="empty-state">
            {isBest
              ? <p>아직 베스트 게시글 기준을 충족한 글이 없습니다.</p>
              : <p>게시글이 없습니다.</p>
            }
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          {[...Array(data.pages)].map((_, i) => (
            <button
              key={i}
              className={`page-btn ${page === i + 1 ? 'active' : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="page-btn"
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
