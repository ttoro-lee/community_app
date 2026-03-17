import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Users, LogIn, LogOut, PenSquare, Shield } from 'lucide-react'
import './Header.css'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <div className="logo-icon">💬</div>
          <span className="logo-text">커뮤니티</span>
        </Link>

        <nav className="header-nav">
          {user ? (
            <>
              {user.is_admin && (
                <Link to="/admin" className="btn btn-ghost btn-sm header-admin-btn">
                  <Shield size={14} />
                  관리
                </Link>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/write')}
              >
                <PenSquare size={14} />
                글쓰기
              </button>
              <Link to="/profile" className="header-avatar" title={user.nickname}>
                <div className="avatar">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.nickname} />
                  ) : (
                    user.nickname?.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="header-nickname">{user.nickname}</span>
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                <LogOut size={14} />
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                <LogIn size={14} />
                로그인
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                <Users size={14} />
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
