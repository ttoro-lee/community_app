import { useState } from 'react'
import { useQuery } from 'react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getPosts, getCategories } from '../api/posts'
import PostCard from '../components/board/PostCard'
import NoticeBar from '../components/board/NoticeBar'
import { Search, PenSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './BoardPage.css'

export default function BoardPage() {
  const { categorySlug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data: categories = [] } = useQuery('categories', () =>
    getCategories().then((r) => r.data)
  )

  const currentCategory = categories.find((c) => c.slug === categorySlug)

  const { data, isLoading } = useQuery(
    ['posts', page, categorySlug, search],
    () =>
      getPosts({
        page,
        size: 15,
        category_id: currentCategory?.id,
        search: search || undefined,
      }).then((r) => r.data),
    { keepPreviousData: true }
  )

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const pageTitle = currentCategory
    ? `${currentCategory.icon} ${currentCategory.name}`
    : '전체 게시글'

  return (
    <div className="board-page fade-in">
      <div className="board-header">
        <h1 className="board-title">{pageTitle}</h1>
        <div className="board-header-actions">
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
          {user && (!currentCategory?.admin_only || user.is_admin) && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/write')}
            >
              <PenSquare size={14} />
              글쓰기
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="category-tabs">
        <Link
          to="/board"
          className={`cat-tab ${!categorySlug ? 'active' : ''}`}
        >
          전체
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

      {/* 공지사항 배너 — 공지사항 카테고리 페이지에서는 숨김 */}
      {!currentCategory?.admin_only && <NoticeBar />}

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
            <p>게시글이 없습니다.</p>
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
