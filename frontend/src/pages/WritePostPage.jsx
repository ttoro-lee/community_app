import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { createPost, updatePost, getPost, getCategories, uploadImage } from '../api/posts'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Send, ImagePlus, Video, X } from 'lucide-react'
import toast from 'react-hot-toast'
import './WritePostPage.css'

export default function WritePostPage() {
  const { postId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isEdit = !!postId
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [youtubeInput, setYoutubeInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)

  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const { data: allCategories = [] } = useQuery('categories', () =>
    getCategories().then((r) => r.data)
  )

  // 일반 유저는 admin_only 카테고리 선택 불가
  const categories = allCategories.filter(
    (c) => user?.is_admin || !c.admin_only
  )

  const { data: existing } = useQuery(
    ['post', postId],
    () => getPost(postId).then((r) => r.data),
    { enabled: isEdit }
  )

  useEffect(() => {
    if (existing) {
      setTitle(existing.title)
      setContent(existing.content)
      setCategoryId(existing.category_id || '')
    }
  }, [existing])

  useEffect(() => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      navigate('/login')
    }
  }, [user])

  // 커서 위치에 텍스트 삽입
  const insertAtCursor = (text) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setContent((prev) => prev + '\n' + text + '\n')
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = content.slice(0, start)
    const after = content.slice(end)
    const newContent = before + (before && !before.endsWith('\n') ? '\n' : '') + text + '\n' + after
    setContent(newContent)
    setTimeout(() => {
      const pos = before.length + (before && !before.endsWith('\n') ? 1 : 0) + text.length + 1
      textarea.selectionStart = textarea.selectionEnd = pos
      textarea.focus()
    }, 0)
  }

  // 이미지 업로드
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadImage(formData)
      insertAtCursor(`[image:${res.data.url}]`)
      toast.success('이미지가 삽입되었습니다.')
    } catch (err) {
      toast.error(err.response?.data?.detail || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // 영상 URL 삽입 (YouTube / Chzzk 지원)
  const handleVideoInsert = () => {
    const url = youtubeInput.trim()
    if (!url) return
    const supportedPattern = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/|chzzk\.naver\.com\/(?:clips|live|video)\/)/
    if (!supportedPattern.test(url)) {
      toast.error('YouTube 또는 Chzzk URL을 입력해주세요.')
      return
    }
    insertAtCursor(url)
    setYoutubeInput('')
    setShowYoutubeInput(false)
    toast.success('영상이 삽입되었습니다.')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.')
      return
    }
    setSubmitting(true)
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        category_id: categoryId ? parseInt(categoryId) : null,
      }
      if (isEdit) {
        await updatePost(postId, data)
        toast.success('수정되었습니다.')
        navigate(`/posts/${postId}`)
      } else {
        const res = await createPost(data)
        toast.success('게시글이 등록되었습니다.')
        navigate(`/posts/${res.data.id}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="write-page fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> 뒤로가기
      </button>

      <div className="write-card">
        <h1 className="write-title">{isEdit ? '게시글 수정' : '새 게시글 작성'}</h1>

        <form className="write-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">카테고리</label>
            <select
              className="form-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">카테고리 선택 (선택사항)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input
              type="text"
              className="form-input"
              placeholder="제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
            <span className="char-count">{title.length}/255</span>
          </div>

          <div className="form-group">
            <label className="form-label">내용 *</label>

            {/* ── 미디어 툴바 ───────────────────────────────────────────── */}
            <div className="media-toolbar">
              {/* 이미지 업로드 */}
              <button
                type="button"
                className="media-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="이미지 삽입"
              >
                <ImagePlus size={15} />
                {uploading ? '업로드 중...' : '이미지'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />

              {/* 영상 URL */}
              <button
                type="button"
                className="media-btn"
                onClick={() => setShowYoutubeInput((v) => !v)}
                title="영상 URL 삽입 (YouTube, Chzzk)"
              >
                <Video size={15} />
                영상 URL
              </button>
            </div>

            {/* 영상 URL 입력창 */}
            {showYoutubeInput && (
              <div className="youtube-input-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="YouTube 또는 Chzzk URL을 붙여넣으세요"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleVideoInsert())}
                  autoFocus
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={handleVideoInsert}>
                  삽입
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowYoutubeInput(false); setYoutubeInput('') }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              className="form-input content-textarea"
              placeholder="내용을 입력하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
            />
          </div>

          <div className="write-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Send size={15} />
              {submitting ? '처리 중...' : isEdit ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
