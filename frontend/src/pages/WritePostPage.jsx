import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { createPost, updatePost, getPost, getCategories } from '../api/posts'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Send } from 'lucide-react'
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
            <textarea
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
