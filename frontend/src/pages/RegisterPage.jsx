import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import './AuthPage.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', nickname: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.email || !form.nickname || !form.password) {
      toast.error('모든 항목을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">💬</div>
        <h1 className="auth-title">회원가입</h1>
        <p className="auth-subtitle">커뮤니티에 참여해보세요!</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">아이디 *</label>
            <input
              type="text"
              name="username"
              className="form-input"
              placeholder="영문, 숫자, 언더스코어 (3~50자)"
              value={form.username}
              onChange={handleChange}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">닉네임 *</label>
            <input
              type="text"
              name="nickname"
              className="form-input"
              placeholder="표시될 이름"
              value={form.nickname}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">이메일 *</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="example@email.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호 *</label>
            <div className="pw-input-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder="8자 이상"
                value={form.password}
                onChange={handleChange}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            <UserPlus size={16} />
            {loading ? '처리 중...' : '가입하기'}
          </button>
        </form>

        <div className="auth-footer">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="auth-link">로그인</Link>
        </div>
      </div>
    </div>
  )
}
