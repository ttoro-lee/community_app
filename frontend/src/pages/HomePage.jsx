import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { getPosts, getCategories } from '../api/posts'
import { getMyPosts } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/board/PostCard'
import { TrendingUp, ArrowRight, ImageIcon, Video } from 'lucide-react'
import './HomePage.css'

function getFirstImageUrl(content) {
  const match = content.match(/\[image:([^\]]+)\]/)
  return match ? match[1] : null
}

function getFirstVideoInfo(content) {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return { platform: 'YouTube', thumbnailUrl: `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg` }
    if (/chzzk\.naver\.com\/clips\//.test(trimmed)) return { platform: 'Chzzk 클립', thumbnailUrl: null }
    if (/chzzk\.naver\.com\/live\//.test(trimmed)) return { platform: 'Chzzk 라이브', thumbnailUrl: null }
    if (/chzzk\.naver\.com\/video\//.test(trimmed)) return { platform: 'Chzzk VOD', thumbnailUrl: null }
  }
  return null
}

export default function HomePage() {
  const { user } = useAuth()

  const { data: postsData, isLoading: postsLoading } = useQuery(
    'home-posts',
    () => getPosts({ page: 1, size: 30 }).then((r) => r.data)
  )

  const { data: categories = [] } = useQuery('categories', () =>
    getCategories().then((r) => r.data)
  )

  const { data: myPostsData } = useQuery(
    'my-posts-check',
    () => getMyPosts({ page: 1, size: 1 }).then((r) => r.data),
    { enabled: !!user }
  )

  const hasWritten = !!user && myPostsData?.total > 0

  const allPosts = postsData?.items ?? []
  const recentPosts = allPosts.slice(0, 8)

  const imagePosts = allPosts
    .map((p) => ({ post: p, imgUrl: getFirstImageUrl(p.content) }))
    .filter((x) => x.imgUrl)
    .slice(0, 12)

  const videoPosts = allPosts
    .map((p) => ({ post: p, videoInfo: getFirstVideoInfo(p.content) }))
    .filter((x) => x.videoInfo)
    .slice(0, 12)

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
            {hasWritten ? '새 글 쓰기 →' : '첫 글 써보기 →'}
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

      {/* Main Content: 2-column layout */}
      <div className="home-main-grid">

        {/* Left: Recent Posts */}
        <section className="home-section home-col-left">
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
              {recentPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {!recentPosts.length && (
                <div className="empty-state">
                  <p>아직 게시글이 없습니다. 첫 글을 작성해보세요!</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right: Photos + Videos stacked */}
        <div className="home-col-right">

          {/* Photo Posts */}
          <section className="home-section">
            <div className="section-header">
              <h2 className="section-title">
                <ImageIcon size={16} style={{ color: '#10b981' }} />
                사진
              </h2>
            </div>
            {postsLoading ? (
              <div className="media-grid-photos">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton-photo-card" />
                ))}
              </div>
            ) : imagePosts.length > 0 ? (
              <div className="media-grid-photos">
                {imagePosts.slice(0, 6).map(({ post, imgUrl }) => (
                  <Link key={post.id} to={`/posts/${post.id}`} className="photo-card">
                    <img src={imgUrl} alt={post.title} className="photo-card-img" loading="lazy" />
                    <div className="photo-card-overlay">
                      <span className="photo-card-title">{post.title}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state-sm"><p>사진 게시글이 없습니다</p></div>
            )}
          </section>

          {/* Video Posts */}
          <section className="home-section">
            <div className="section-header">
              <h2 className="section-title">
                <Video size={16} style={{ color: '#f59e0b' }} />
                동영상
              </h2>
            </div>
            {postsLoading ? (
              <div className="media-grid-videos">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="skeleton-video-card" />
                ))}
              </div>
            ) : videoPosts.length > 0 ? (
              <div className="media-grid-videos">
                {videoPosts.slice(0, 4).map(({ post, videoInfo }) => (
                  <Link key={post.id} to={`/posts/${post.id}`} className="video-card">
                    {videoInfo.thumbnailUrl ? (
                      <img src={videoInfo.thumbnailUrl} alt={post.title} className="video-card-thumb" loading="lazy" />
                    ) : (
                      <div className="video-card-placeholder">
                        <Video size={24} />
                        <span>{videoInfo.platform}</span>
                      </div>
                    )}
                    <div className="video-card-platform-badge">{videoInfo.platform}</div>
                    <p className="video-card-title">{post.title}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state-sm"><p>동영상 게시글이 없습니다</p></div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
