import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { checkUsername } from '../api/auth'
import './AuthPage.css'

const RULES = {
  username: [
    { test: (v) => v.length >= 3 && v.length <= 50, msg: '3~50자' },
    { test: (v) => /^[a-zA-Z0-9_]+$/.test(v), msg: '영문·숫자·언더스코어(_)만 사용 가능' },
  ],
  email: [
    { test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: '올바른 이메일 형식' },
  ],
  nickname: [
    { test: (v) => v.length >= 1 && v.length <= 30, msg: '1~30자' },
  ],
  password: [
    { test: (v) => v.length >= 8, msg: '8자 이상' },
  ],
}

function getFieldErrors(field, value) {
  if (!value) return []
  return RULES[field].filter((r) => !r.test(value)).map((r) => r.msg)
}

function FieldHint({ field, value, touched }) {
  if (!touched || !value) return null
  const errors = getFieldErrors(field, value)
  return (
    <ul className="field-hint-list">
      {RULES[field].map((r) => {
        const ok = r.test(value)
        return (
          <li key={r.msg} className={ok ? 'hint-ok' : 'hint-fail'}>
            {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {r.msg}
          </li>
        )
      })}
    </ul>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', nickname: '', password: '' })
  const [touched, setTouched] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  // null: 미확인, 'available': 사용 가능, 'taken': 사용 중
  const [usernameCheck, setUsernameCheck] = useState(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const handleChange = (e) => {
    if (e.target.name === 'username') setUsernameCheck(null)
    setForm({ ...form, [e.target.name]: e.target.value })
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))
  }

  const handleCheckUsername = async () => {
    const username = form.username.trim()
    const formatErrors = getFieldErrors('username', username)
    if (!username || formatErrors.length > 0) {
      setTouched((prev) => ({ ...prev, username: true }))
      toast.error('아이디 형식을 확인해주세요.')
      return
    }
    setCheckingUsername(true)
    try {
      const res = await checkUsername(username)
      setUsernameCheck(res.data.available ? 'available' : 'taken')
    } catch {
      toast.error('중복 확인에 실패했습니다.')
    } finally {
      setCheckingUsername(false)
    }
  }

  const handleBlur = (e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }))
  }

  const isFieldError = (field) =>
    touched[field] && form[field] && getFieldErrors(field, form[field]).length > 0

  const validate = () => {
    const fields = ['username', 'email', 'nickname', 'password']
    // 빈 항목 체크
    const empty = fields.filter((f) => !form[f].trim())
    if (empty.length > 0) {
      setTouched(Object.fromEntries(fields.map((f) => [f, true])))
      toast.error('모든 항목을 입력해주세요.')
      return false
    }
    // 형식 체크
    const allErrors = fields.flatMap((f) => getFieldErrors(f, form[f]))
    if (allErrors.length > 0) {
      setTouched(Object.fromEntries(fields.map((f) => [f, true])))
      toast.error('입력 형식을 확인해주세요.')
      return false
    }
    // 아이디 중복 확인 체크
    if (usernameCheck === null) {
      toast.error('아이디 중복 확인을 해주세요.')
      return false
    }
    if (usernameCheck === 'taken') {
      toast.error('이미 사용 중인 아이디입니다.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await register(form)
      toast.success('회원가입이 완료되었습니다. 로그인해주세요.')
      navigate('/login')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        toast.error(detail)
      } else {
        toast.error('회원가입에 실패했습니다.')
      }
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
          {/* 아이디 */}
          <div className="form-group">
            <label className="form-label">아이디 *</label>
            <div className="username-check-wrap">
              <input
                type="text"
                name="username"
                className={`form-input${isFieldError('username') ? ' input-error' : ''}`}
                placeholder="영문·숫자·언더스코어, 3~50자"
                value={form.username}
                onChange={handleChange}
                onBlur={handleBlur}
                autoFocus
                autoComplete="username"
              />
              <button
                type="button"
                className="btn btn-outline btn-check-username"
                onClick={handleCheckUsername}
                disabled={checkingUsername}
              >
                {checkingUsername ? '확인 중...' : '중복확인'}
              </button>
            </div>
            {usernameCheck === 'available' && (
              <p className="username-check-msg available">
                <CheckCircle size={13} /> 사용 가능한 아이디입니다.
              </p>
            )}
            {usernameCheck === 'taken' && (
              <p className="username-check-msg taken">
                <XCircle size={13} /> 이미 사용 중인 아이디입니다.
              </p>
            )}
            <FieldHint field="username" value={form.username} touched={touched.username} />
          </div>

          {/* 닉네임 */}
          <div className="form-group">
            <label className="form-label">닉네임 *</label>
            <input
              type="text"
              name="nickname"
              className={`form-input${isFieldError('nickname') ? ' input-error' : ''}`}
              placeholder="표시될 이름 (1~30자)"
              value={form.nickname}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="nickname"
            />
            <FieldHint field="nickname" value={form.nickname} touched={touched.nickname} />
          </div>

          {/* 이메일 */}
          <div className="form-group">
            <label className="form-label">이메일 *</label>
            <input
              type="text"
              name="email"
              className={`form-input${isFieldError('email') ? ' input-error' : ''}`}
              placeholder="example@email.com"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="email"
            />
            <FieldHint field="email" value={form.email} touched={touched.email} />
          </div>

          {/* 비밀번호 */}
          <div className="form-group">
            <label className="form-label">비밀번호 *</label>
            <div className="pw-input-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                className={`form-input${isFieldError('password') ? ' input-error' : ''}`}
                placeholder="8자 이상"
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="new-password"
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldHint field="password" value={form.password} touched={touched.password} />
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
