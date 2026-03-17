import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { getPosts, getCategories } from '../api/posts'
import PostCard from '../components/board/PostCard'
import { TrendingUp, ArrowRight } from 'lucide-react'
import './HomePage.css'

export default function HomePage() {
  const { data: postsData, isLoading: postsLoading } = useQuery(
    'home-posts',
    () => getPosts({ page: 1, size: 8 }).then((r) => r.data)
  )

  const { data: categories = [] } = useQuery('categories', () =>
    getCategories().then((r) => r.data)
  )

  return (
    <div className="home-page fade-in">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-content">
          <h1 className="hero-title">함께 이야기 나눠요 💬</h1>
          <p className="hero-subtitle">
            자유롭게 글을 쓰고, 댓글로 소통하며 커뮤니티를 만들어가세요.
          </p>
          <Link to="/write" className="btn btn-primary btn-lg">
            첫 글 써보기 →
          </Link>
        </div>
        <div className="hero-decoration" aria-hidden="true">
          {['💬', '✨', '🎉', '💡', '🔥'].map((e, i) => (
            <span key={i} className={`hero-emoji e${i}`}>{e}</span>
          ))}
        </div>
      </div>

      {/* Category Grid */}
      <section className="home-section">
        <div className="section-header">
          <h2 className="section-title">카테고리</h2>
          <Link to="/board" className="see-all">전체보기 <ArrowRight size={14} /></Link>
        </div>
        <div className="category-grid">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/board/${cat.slug}`} className="category-card">
              <span className="cat-emoji">{cat.icon}</span>
              <span className="cat-title">{cat.name}</span>
              <span className="cat-count-badge">{cat.post_count}개</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Posts */}
      <section className="home-section">
        <div className="section-header">
          <h2 className="section-title">
            <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
            최신 게시글
          </h2>
          <Link to="/board" className="see-all">더 보기 <ArrowRight size={14} /></Link>
        </div>

        {postsLoading ? (
          <div className="loading-list">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : (
          <div className="posts-list">
            {postsData?.items?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {!postsData?.items?.length && (
              <div className="empty-state">
                <p>아직 게시글이 없습니다. 첫 글을 작성해보세요!</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
