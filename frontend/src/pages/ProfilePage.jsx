import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { updateMe } from '../api/auth'
import { User, Save } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import './ProfilePage.css'

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) { navigate('/login'); return null }

  const [nickname, setNickname] = useState(user.nickname)
  const [bio, setBio] = useState(user.bio || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateMe({ nickname, bio })
      setUser(res.data)
      toast.success('프로필이 수정되었습니다.')
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const joinDate = format(new Date(user.created_at), 'yyyy년 MM월 dd일', { locale: ko })

  return (
    <div className="profile-page fade-in">
      <div className="profile-header-card">
        <div className="profile-avatar-lg">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.nickname} />
          ) : (
            user.nickname?.charAt(0).toUpperCase()
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user.nickname}</h1>
          <p className="profile-username">@{user.username}</p>
          <p className="profile-joined">가입일: {joinDate}</p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
        </div>
      </div>

      <div className="profile-edit-card">
        <h2 className="profile-edit-title">
          <User size={18} /> 프로필 수정
        </h2>
        <form className="profile-form" onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">닉네임</label>
            <input
              type="text"
              className="form-input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label className="form-label">소개</label>
            <textarea
              className="form-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="자신을 소개해주세요..."
              rows={4}
              maxLength={500}
            />
          </div>
          <div className="profile-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              {saving ? '저장 중...' : '저장하기'}
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => { logout(); navigate('/') }}
            >
              로그아웃
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
