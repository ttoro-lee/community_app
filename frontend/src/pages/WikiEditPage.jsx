import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { getWikiDocument, createWikiDocument, updateWikiDocument } from '../api/wiki'
import { uploadImage } from '../api/posts'
import { useAuth } from '../contexts/AuthContext'
import WikiContentRenderer from '../components/wiki/WikiContentRenderer'
import {
  ArrowLeft, Plus, Trash2, GripVertical, Link2, Eye, EyeOff,
  ChevronUp, ChevronDown, Save, BookOpen, Info, ImagePlus, Video,
} from 'lucide-react'
import toast from 'react-hot-toast'
import './WikiEditPage.css'

// ── 링크 삽입 모달 ─────────────────────────────────────────────────────────────

function LinkModal({ onInsert, onClose }) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!label.trim() || !url.trim()) return
    let href = url.trim()
    if (!/^https?:\/\//i.test(href)) href = 'https://' + href
    onInsert(`[${label.trim()}](${href})`)
  }

  return (
    <div className="wiki-modal-overlay" onClick={onClose}>
      <div className="wiki-modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="wiki-modal-title"><Link2 size={15} /> 하이퍼링크 삽입</h3>
        <form onSubmit={handleSubmit} className="wiki-modal-form">
          <label className="wiki-modal-label">
            표시 텍스트
            <input
              className="wiki-modal-input"
              type="text"
              placeholder="클릭할 텍스트"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </label>
          <label className="wiki-modal-label">
            URL
            <input
              className="wiki-modal-input"
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <p className="wiki-modal-hint">
            삽입 후 미리보기: <code>[{label || '텍스트'}]({url || 'https://...'})</code>
          </p>
          <div className="wiki-modal-actions">
            <button type="button" className="wiki-btn-ghost" onClick={onClose}>취소</button>
            <button type="submit" className="wiki-btn-primary" disabled={!label.trim() || !url.trim()}>
              삽입
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── 단락 섹션 에디터 ───────────────────────────────────────────────────────────

function SectionEditor({ section, index, total, onChange, onDelete, onMoveUp, onMoveDown }) {
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showVideoInput, setShowVideoInput] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const insertAtCursor = (text) => {
    const ta = textareaRef.current
    if (!ta) {
      onChange({ ...section, content: section.content + text })
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = section.content.slice(0, start)
    const after = section.content.slice(end)
    // Ensure the marker is on its own line
    const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
    const suffix = after.length > 0 && !after.startsWith('\n') ? '\n' : ''
    const insertion = prefix + text + suffix
    const newContent = before + insertion + after
    onChange({ ...section, content: newContent })
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + insertion.length
      ta.focus()
    }, 0)
  }

  const insertInline = (text) => {
    const ta = textareaRef.current
    if (!ta) {
      onChange({ ...section, content: section.content + text })
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newContent = section.content.slice(0, start) + text + section.content.slice(end)
    onChange({ ...section, content: newContent })
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length
      ta.focus()
    }, 0)
  }

  const handleInsertLink = (markup) => {
    insertInline(markup)
    setShowLinkModal(false)
  }

  const insertBold = () => {
    const ta = textareaRef.current
    if (!ta) { insertInline('**굵은 텍스트**'); return }
    const sel = section.content.slice(ta.selectionStart, ta.selectionEnd)
    insertInline(`**${sel || '굵은 텍스트'}**`)
  }

  const insertItalic = () => {
    const ta = textareaRef.current
    if (!ta) { insertInline('*기울임 텍스트*'); return }
    const sel = section.content.slice(ta.selectionStart, ta.selectionEnd)
    insertInline(`*${sel || '기울임 텍스트'}*`)
  }

  // 이미지 업로드
  const handleImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.')
      return
    }
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadImage(formData)
      insertAtCursor(`[image:${res.data.url}]`)
      toast.success('이미지가 삽입되었습니다.')
    } catch {
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImageInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
  }

  // 드래그 앤 드롭
  const handleDragOver = (e) => { e.preventDefault() }
  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageFile(file)
  }

  // 영상 URL 삽입 — [video:URL] 마커로 삽입 (YouTube·Chzzk·직접 링크 모두 통일)
  const handleInsertVideo = () => {
    const url = videoUrl.trim()
    if (!url) return
    let href = url
    if (!/^https?:\/\//i.test(href)) href = 'https://' + href
    insertAtCursor(`[video:${href}]`)
    setVideoUrl('')
    setShowVideoInput(false)
    toast.success('영상 URL이 삽입되었습니다.')
  }

  return (
    <div className="wiki-section-editor">
      <div className="wiki-section-drag-handle">
        <GripVertical size={15} />
        <span className="wiki-section-index">#{index + 1}</span>
      </div>

      <div className="wiki-section-fields">
        {/* 단락 제목 */}
        <div className="wiki-section-heading-row">
          <input
            className="wiki-section-heading-input"
            type="text"
            placeholder="단락 제목 (선택 — 비워두면 제목 없이 본문만 표시)"
            value={section.heading}
            onChange={(e) => onChange({ ...section, heading: e.target.value })}
            maxLength={100}
          />
        </div>

        {/* 툴바 */}
        <div className="wiki-editor-toolbar">
          <button type="button" className="wiki-toolbar-btn" onClick={insertBold} title="굵게 (**텍스트**)">
            <strong>B</strong>
          </button>
          <button type="button" className="wiki-toolbar-btn" onClick={insertItalic} title="기울임 (*텍스트*)">
            <em>I</em>
          </button>
          <button type="button" className="wiki-toolbar-btn" onClick={() => setShowLinkModal(true)} title="하이퍼링크 삽입">
            <Link2 size={14} />
          </button>
          <span className="wiki-toolbar-sep" />
          {/* 이미지 업로드 */}
          <button
            type="button"
            className={`wiki-toolbar-btn${uploadingImage ? ' wiki-toolbar-btn--loading' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            title="이미지 삽입"
          >
            <ImagePlus size={14} />
          </button>
          {/* 영상 URL 삽입 */}
          <button
            type="button"
            className={`wiki-toolbar-btn${showVideoInput ? ' wiki-toolbar-btn--active' : ''}`}
            onClick={() => setShowVideoInput((v) => !v)}
            title="YouTube / Chzzk 영상 삽입"
          >
            <Video size={14} />
          </button>
          <span className="wiki-toolbar-sep" />
          <span className="wiki-toolbar-hint">
            링크: <code>[텍스트](url)</code>&nbsp;&nbsp;이미지: <code>[image:URL]</code>&nbsp;&nbsp;영상: <code>[video:URL]</code>
          </span>
        </div>

        {/* 영상 URL 입력 인라인 패널 */}
        {showVideoInput && (
          <div className="wiki-video-input-row">
            <input
              className="wiki-video-url-input"
              type="text"
              placeholder="YouTube 또는 Chzzk URL을 붙여넣으세요"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInsertVideo() } }}
              autoFocus
            />
            <button
              type="button"
              className="wiki-btn-primary wiki-video-insert-btn"
              onClick={handleInsertVideo}
              disabled={!videoUrl.trim()}
            >
              삽입
            </button>
            <button
              type="button"
              className="wiki-btn-ghost"
              onClick={() => { setShowVideoInput(false); setVideoUrl('') }}
            >
              취소
            </button>
          </div>
        )}

        {/* 본문 textarea */}
        <textarea
          ref={textareaRef}
          className="wiki-section-textarea"
          placeholder="단락 내용을 입력하세요... (이미지를 드래그해서 놓을 수 있습니다)"
          value={section.content}
          onChange={(e) => onChange({ ...section, content: e.target.value })}
          rows={6}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageInputChange}
      />

      {/* 섹션 액션 */}
      <div className="wiki-section-actions">
        <button
          type="button"
          className="wiki-section-btn"
          onClick={onMoveUp}
          disabled={index === 0}
          title="위로"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          className="wiki-section-btn"
          onClick={onMoveDown}
          disabled={index === total - 1}
          title="아래로"
        >
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          className="wiki-section-btn wiki-section-delete"
          onClick={onDelete}
          title="단락 삭제"
          disabled={total <= 1}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {showLinkModal && (
        <LinkModal onInsert={handleInsertLink} onClose={() => setShowLinkModal(false)} />
      )}
    </div>
  )
}

// ── 메인 편집 페이지 ──────────────────────────────────────────────────────────

export default function WikiEditPage() {
  const { wikiId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isEdit = !!wikiId

  const [title, setTitle] = useState('')
  const [sections, setSections] = useState([{ heading: '', content: '' }])
  const [editSummary, setEditSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const { data: existing, isLoading: loadingDoc } = useQuery(
    ['wikiDocument', wikiId],
    () => getWikiDocument(wikiId),
    { enabled: isEdit, staleTime: 0 }
  )

  useEffect(() => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      navigate('/login')
    }
  }, [user])

  useEffect(() => {
    if (existing) {
      setTitle(existing.title)
      const revSections = existing.latest_revision?.sections ?? []
      setSections(revSections.length ? revSections : [{ heading: '', content: '' }])
    }
  }, [existing])

  const addSection = () => {
    setSections((prev) => [...prev, { heading: '', content: '' }])
  }

  const updateSection = (idx, updated) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? updated : s)))
  }

  const deleteSection = (idx) => {
    if (sections.length <= 1) return
    setSections((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveSection = (idx, direction) => {
    const newSections = [...sections]
    const target = idx + direction
    if (target < 0 || target >= newSections.length) return
    ;[newSections[idx], newSections[target]] = [newSections[target], newSections[idx]]
    setSections(newSections)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('문서 제목을 입력해주세요.'); return }
    const hasContent = sections.some((s) => s.content.trim() || s.heading.trim())
    if (!hasContent) { toast.error('최소 하나의 단락에 내용을 입력해주세요.'); return }

    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        sections: sections.map((s) => ({ heading: s.heading.trim(), content: s.content })),
        edit_summary: editSummary.trim() || undefined,
      }
      if (isEdit) {
        await updateWikiDocument(wikiId, payload)
        toast.success('문서가 수정되었습니다.')
        navigate(`/wiki/${wikiId}`)
      } else {
        const created = await createWikiDocument(payload)
        toast.success('문서가 작성되었습니다.')
        navigate(`/wiki/${created.id}`)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || '저장 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isEdit && loadingDoc) {
    return <div className="wiki-edit-loading">문서 불러오는 중...</div>
  }

  return (
    <div className="wiki-edit-page fade-in">
      {/* 헤더 */}
      <div className="wiki-edit-header">
        <button className="wiki-back-btn2" onClick={() => navigate(isEdit ? `/wiki/${wikiId}` : '/wiki')}>
          <ArrowLeft size={15} />
          {isEdit ? '문서로 돌아가기' : '위키 목록'}
        </button>
        <div className="wiki-edit-title-badge">
          <BookOpen size={15} />
          {isEdit ? '문서 수정' : '새 문서 작성'}
        </div>
        <button
          type="button"
          className="wiki-preview-toggle"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? <><EyeOff size={14} /> 에디터</>  : <><Eye size={14} /> 미리보기</>}
        </button>
      </div>

      {showPreview ? (
        /* ── 미리보기 ─────────────────────────────────────────────────── */
        <div className="wiki-preview-wrap">
          <div className="wiki-preview-label">미리보기</div>
          <div className="wiki-preview-content">
            <h1 className="wiki-preview-title">{title || '(제목 없음)'}</h1>
            <WikiContentRenderer sections={sections} />
          </div>
        </div>
      ) : (
        /* ── 에디터 ──────────────────────────────────────────────────── */
        <form className="wiki-edit-form" onSubmit={handleSubmit}>
          {/* 문서 제목 */}
          <div className="wiki-form-group">
            <label className="wiki-form-label">문서 제목 <span className="wiki-required">*</span></label>
            <input
              className="wiki-title-input"
              type="text"
              placeholder="문서 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              required
            />
          </div>

          {/* 도움말 */}
          <div className="wiki-edit-help">
            <Info size={13} />
            <span>
              링크: <code>[텍스트](https://url)</code>&nbsp;&nbsp;
              굵게: <code>**텍스트**</code>&nbsp;&nbsp;
              기울임: <code>*텍스트*</code>&nbsp;&nbsp;
              이미지: 툴바 📷 버튼 또는 드래그 앤 드롭&nbsp;&nbsp;
              영상: 툴바 🎬 버튼으로 YouTube / Chzzk URL 삽입
            </span>
          </div>

          {/* 단락 섹션들 */}
          <div className="wiki-sections-list">
            {sections.map((section, idx) => (
              <SectionEditor
                key={idx}
                section={section}
                index={idx}
                total={sections.length}
                onChange={(updated) => updateSection(idx, updated)}
                onDelete={() => deleteSection(idx)}
                onMoveUp={() => moveSection(idx, -1)}
                onMoveDown={() => moveSection(idx, 1)}
              />
            ))}
          </div>

          {/* 단락 추가 버튼 */}
          <button type="button" className="wiki-add-section-btn" onClick={addSection}>
            <Plus size={15} /> 단락 추가
          </button>

          {/* 편집 요약 */}
          <div className="wiki-form-group">
            <label className="wiki-form-label">
              편집 요약
              <span className="wiki-form-hint"> (선택 — 어떤 내용을 수정했는지 간략히 기록)</span>
            </label>
            <input
              className="wiki-summary-input"
              type="text"
              placeholder={isEdit ? '예: 오타 수정, 내용 보완' : '문서 최초 작성'}
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              maxLength={300}
            />
          </div>

          {/* 저장 */}
          <div className="wiki-submit-row">
            <button
              type="button"
              className="wiki-btn-ghost"
              onClick={() => navigate(isEdit ? `/wiki/${wikiId}` : '/wiki')}
            >
              취소
            </button>
            <button type="submit" className="wiki-btn-submit" disabled={submitting}>
              <Save size={14} />
              {submitting ? '저장 중...' : isEdit ? '수정 저장' : '문서 등록'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
