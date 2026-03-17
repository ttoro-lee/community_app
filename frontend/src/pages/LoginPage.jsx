import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import './AuthPage.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) { toast.error('아이디와 비밀번호를 입력해주세요.'); return }
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail

      if (status === 403 && detail?.message === '활동이 정지된 계정입니다.') {
        const until = detail.suspended_until
          ? new Date(detail.suspended_until).toLocaleString('ko-KR')
          : ''
        const reason = detail.reason ? ` / 사유: ${detail.reason}` : ''
        toast.error(
          `계정이 정지된 상태입니다.${until ? ` ${until}까지 이용이 제한됩니다.` : ''}${reason}`,
          { duration: 6000 }
        )
      } else if (typeof detail === 'string') {
        toast.error(detail)
      } else {
        toast.error('아이디 또는 비밀번호가 올바르지 않습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">💬</div>
        <h1 className="auth-title">로그인</h1>
        <p className="auth-subtitle">커뮤니티에 오신 것을 환영합니다</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">아이디</label>
            <input
              type="text"
              className="form-input"
              placeholder="사용자명 입력"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <div className="pw-input-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            <LogIn size={16} />
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="auth-footer">
          아직 계정이 없으신가요?{' '}
          <Link to="/register" className="auth-link">회원가입</Link>
        </div>
      </div>
    </div>
  )
}
