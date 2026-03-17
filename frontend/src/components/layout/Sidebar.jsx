import { Link, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { getCategories } from '../../api/posts'
import { Home, TrendingUp, Trophy } from 'lucide-react'
import './Sidebar.css'

export default function Sidebar() {
  const { categorySlug } = useParams()
  const { data: categories = [] } = useQuery('categories', () =>
    getCategories().then((r) => r.data)
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-title">메뉴</h3>
        <nav className="sidebar-nav">
          <Link to="/" className={`sidebar-item ${!categorySlug && location.pathname === '/' ? 'active' : ''}`}>
            <Home size={16} />
            홈
          </Link>
          <Link to="/board" className={`sidebar-item ${location.pathname === '/board' && !categorySlug ? 'active' : ''}`}>
            <TrendingUp size={16} />
            전체 게시글
          </Link>
          <Link to="/board/best" className={`sidebar-item ${categorySlug === 'best' ? 'active' : ''}`}>
            <Trophy size={16} />
            베스트 게시글
          </Link>
        </nav>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">카테고리</h3>
        <nav className="sidebar-nav">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/board/${cat.slug}`}
              className={`sidebar-item ${categorySlug === cat.slug ? 'active' : ''}`}
            >
              <span className="cat-icon">{cat.icon}</span>
              <span className="cat-name">{cat.name}</span>
              <span className="cat-count">{cat.post_count}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
