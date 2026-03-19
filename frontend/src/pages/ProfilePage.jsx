import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { updateMe, changePassword, deleteAccount, getMyPosts, getMyComments } from '../api/auth'
import {
  User, Save, Lock, Trash2, FileText, ChevronLeft, ChevronRight,
  MessageSquare, Eye, Heart, Calendar, Reply,
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import './ProfilePage.css'

const TABS = [
  { id: 'posts',    label: '내가 쓴 글',    icon: FileText },
  { id: 'comments', label: '내가 쓴 댓글',  icon: MessageSquare },
  { id: 'profile',  label: '프로필 수정',   icon: User },
  { id: 'password', label: '비밀번호 변경', icon: Lock },
  { id: 'delete',   label: '계정 탈퇴',     icon: Trash2 },
]

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('posts')

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  if (!user) return null

  const joinDate = format(new Date(user.created_at), 'yyyy년 MM월 dd일', { locale: ko })

  return (
    <div className="profile-page fade-in">
      {/* 상단 프로필 헤더 */}
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
          <p className="profile-joined">
            <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />
            가입일: {joinDate}
          </p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="profile-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`profile-tab${activeTab === id ? ' active' : ''}${id === 'delete' ? ' danger' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className="profile-content-card">
        {activeTab === 'posts'    && <MyPostsTab />}
        {activeTab === 'comments' && <MyCommentsTab />}
        {activeTab === 'profile'  && <ProfileEditTab user={user} setUser={setUser} />}
        {activeTab === 'password' && <PasswordTab />}
        {activeTab === 'delete'   && <DeleteTab logout={logout} navigate={navigate} />}
      </div>
    </div>
  )
}

/* ── 내가 쓴 글 ──────────────────────────────────── */
function MyPostsTab() {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchPosts = async (p = 1) => {
    setLoading(true)
    try {
      const res = await getMyPosts({ page: p, size: 15 })
      setPosts(res.data.items)
      setTotal(res.data.total)
      setPages(res.data.pages)
      setPage(res.data.page)
    } catch {
      toast.error('게시글을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts(1) }, [])

  if (loading) return <div className="tab-loading">불러오는 중...</div>

  return (
    <div className="my-posts-tab">
      <div className="tab-title-row">
        <h2 className="tab-title"><FileText size={17} /> 내가 쓴 글</h2>
        <span className="tab-count">총 {total}개</span>
      </div>

      {posts.length === 0 ? (
        <div className="tab-empty">작성한 게시글이 없습니다.</div>
      ) : (
        <ul className="my-post-list">
          {posts.map((post) => (
            <li key={post.id} className="my-post-item">
              <Link to={`/posts/${post.id}`} className="my-post-title">
                {post.is_notice && <span className="my-post-badge notice">공지</span>}
                {post.is_pinned && <span className="my-post-badge pinned">고정</span>}
                {post.title}
              </Link>
              <div className="my-post-meta">
                {post.category && (
                  <span className="my-post-category">{post.category.name}</span>
                )}
                <span className="my-post-stat"><Eye size={12} /> {post.view_count}</span>
                <span className="my-post-stat"><Heart size={12} /> {post.like_count}</span>
                <span className="my-post-stat"><MessageSquare size={12} /> {post.comment_count}</span>
                <span className="my-post-date">
                  {format(new Date(post.created_at), 'yyyy.MM.dd', { locale: ko })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="tab-pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => fetchPosts(page - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="page-info">{page} / {pages}</span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= pages}
            onClick={() => fetchPosts(page + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── 내가 쓴 댓글 ────────────────────────────────── */
function MyCommentsTab() {
  const [comments, setComments] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchComments = async (p = 1) => {
    setLoading(true)
    try {
      const res = await getMyComments({ page: p, size: 15 })
      setComments(res.data.items)
      setTotal(res.data.total)
      setPages(res.data.pages)
      setPage(res.data.page)
    } catch {
      toast.error('댓글을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComments(1) }, [])

  if (loading) return <div className="tab-loading">불러오는 중...</div>

  return (
    <div className="my-posts-tab">
      <div className="tab-title-row">
        <h2 className="tab-title"><MessageSquare size={17} /> 내가 쓴 댓글</h2>
        <span className="tab-count">총 {total}개</span>
      </div>

      {comments.length === 0 ? (
        <div className="tab-empty">작성한 댓글이 없습니다.</div>
      ) : (
        <ul className="my-post-list">
          {comments.map((comment) => (
            <li key={comment.id} className="my-post-item">
              <Link to={`/posts/${comment.post_id}`} className="my-post-title">
                {comment.parent_id != null && (
                  <span className="my-post-badge reply">
                    <Reply size={10} /> 대댓글
                  </span>
                )}
                {comment.content}
              </Link>
              <div className="my-post-meta">
                <span className="my-post-category">{comment.post_title}</span>
                <span className="my-post-stat"><Heart size={12} /> {comment.like_count}</span>
                <span className="my-post-date">
                  {format(new Date(comment.created_at), 'yyyy.MM.dd', { locale: ko })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="tab-pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => fetchComments(page - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="page-info">{page} / {pages}</span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= pages}
            onClick={() => fetchComments(page + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── 프로필 수정 ─────────────────────────────────── */
function ProfileEditTab({ user, setUser }) {
  const [nickname, setNickname] = useState(user.nickname)
  const [bio, setBio] = useState(user.bio || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) { toast.error('닉네임을 입력해주세요.'); return }
    setSaving(true)
    try {
      const res = await updateMe({ nickname: nickname.trim(), bio: bio.trim() })
      setUser(res.data)
      toast.success('프로필이 수정되었습니다.')
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tab-form-wrap">
      <h2 className="tab-title"><User size={17} /> 프로필 수정</h2>
      <form className="profile-form" onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">사용자명 (변경 불가)</label>
          <input type="text" className="form-input" value={user.username} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">이메일 (변경 불가)</label>
          <input type="text" className="form-input" value={user.email} disabled />
        </div>
        <div className="form-group">
          <label className="form-label"><span className="required">*</span> 닉네임</label>
          <input
            type="text"
            className="form-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={50}
            placeholder="닉네임을 입력하세요"
          />
        </div>
        <div className="form-group">
          <label className="form-label">자기소개</label>
          <textarea
            className="form-input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="자신을 소개해주세요..."
            rows={4}
            maxLength={500}
          />
          <span className="char-count">{bio.length} / 500</span>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={15} />
            {saving ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── 비밀번호 변경 ───────────────────────────────── */
function PasswordTab() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      toast.error('새 비밀번호가 일치하지 않습니다.')
      return
    }
    if (form.new_password.length < 8) {
      toast.error('새 비밀번호는 8자 이상이어야 합니다.')
      return
    }
    setSaving(true)
    try {
      await changePassword({ current_password: form.current_password, new_password: form.new_password })
      toast.success('비밀번호가 변경되었습니다.')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tab-form-wrap">
      <h2 className="tab-title"><Lock size={17} /> 비밀번호 변경</h2>
      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label"><span className="required">*</span> 현재 비밀번호</label>
          <input
            type="password"
            className="form-input"
            name="current_password"
            value={form.current_password}
            onChange={handleChange}
            placeholder="현재 비밀번호를 입력하세요"
            autoComplete="current-password"
          />
        </div>
        <div className="form-group">
          <label className="form-label"><span className="required">*</span> 새 비밀번호</label>
          <input
            type="password"
            className="form-input"
            name="new_password"
            value={form.new_password}
            onChange={handleChange}
            placeholder="새 비밀번호 (8자 이상)"
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label className="form-label"><span className="required">*</span> 새 비밀번호 확인</label>
          <input
            type="password"
            className="form-input"
            name="confirm_password"
            value={form.confirm_password}
            onChange={handleChange}
            placeholder="새 비밀번호를 다시 입력하세요"
            autoComplete="new-password"
          />
          {form.confirm_password && (
            <span className={`pw-match ${form.new_password === form.confirm_password ? 'ok' : 'ng'}`}>
              {form.new_password === form.confirm_password ? '✓ 비밀번호가 일치합니다' : '✗ 비밀번호가 일치하지 않습니다'}
            </span>
          )}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Lock size={15} />
            {saving ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── 계정 탈퇴 ───────────────────────────────────── */
function DeleteTab({ logout, navigate }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.preventDefault()
    if (confirm !== '탈퇴하겠습니다') {
      toast.error('확인 문구를 정확히 입력해주세요.')
      return
    }
    setDeleting(true)
    try {
      await deleteAccount({ password })
      toast.success('계정이 탈퇴되었습니다.')
      logout()
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="tab-form-wrap">
      <h2 className="tab-title danger-title"><Trash2 size={17} /> 계정 탈퇴</h2>
      <div className="danger-box">
        <p className="danger-notice">⚠️ 계정을 탈퇴하면 <strong>모든 데이터가 비활성화</strong>되며 복구할 수 없습니다.</p>
        <ul className="danger-list">
          <li>작성한 게시글 및 댓글은 남아 있지만 계정은 비활성화됩니다.</li>
          <li>동일한 아이디로 재가입이 불가합니다.</li>
        </ul>
      </div>
      <form className="profile-form" onSubmit={handleDelete}>
        <div className="form-group">
          <label className="form-label"><span className="required">*</span> 비밀번호 확인</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="현재 비밀번호를 입력하세요"
            autoComplete="current-password"
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            <span className="required">*</span> 확인 문구 입력
            <span className="confirm-hint"> — "탈퇴하겠습니다" 를 입력해주세요</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="탈퇴하겠습니다"
          />
        </div>
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-danger"
            disabled={deleting || !password || confirm !== '탈퇴하겠습니다'}
          >
            <Trash2 size={15} />
            {deleting ? '처리 중...' : '계정 탈퇴'}
          </button>
        </div>
      </form>
    </div>
  )
}
