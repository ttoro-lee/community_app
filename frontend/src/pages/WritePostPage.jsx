import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { createPost, updatePost, getPost, getCategories, uploadImage } from '../api/posts'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft, Send, ImagePlus, Video, X, Smile, Table2,
  Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered, Minus,
  Eye, PencilLine,
} from 'lucide-react'
import toast from 'react-hot-toast'
import EmoticonPicker from '../components/emoticon/EmoticonPicker'
import ContentRenderer from '../components/post/ContentRenderer'
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
  const [isDragging, setIsDragging] = useState(false)
  const [youtubeInput, setYoutubeInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // 표 모달
  const [showTableModal, setShowTableModal] = useState(false)
  const [tableCols, setTableCols] = useState(3)
  const [tableRows, setTableRows] = useState(3)
  const [tableHeaders, setTableHeaders] = useState(['', '', ''])
  const [tableData, setTableData] = useState([['', '', ''], ['', '', ''], ['', '', '']])

  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const emoticonBtnRef = useRef(null)

  const { data: allCategories = [] } = useQuery('categories', () =>
    getCategories().then((r) => r.data)
  )
  const categories = allCategories.filter((c) => user?.is_admin || !c.admin_only)

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

  // ── 커서 위치에 텍스트 삽입 ────────────────────────────────────────────
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
    const newContent =
      before + (before && !before.endsWith('\n') ? '\n' : '') + text + '\n' + after
    setContent(newContent)
    setTimeout(() => {
      const pos =
        before.length + (before && !before.endsWith('\n') ? 1 : 0) + text.length + 1
      textarea.selectionStart = textarea.selectionEnd = pos
      textarea.focus()
    }, 0)
  }

  // ── 마크다운 인라인 서식 (선택 영역을 prefix/suffix로 감쌈) ─────────────
  const applyInlineFormat = (prefix, suffix) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.slice(start, end)
    const before = content.slice(0, start)
    const after = content.slice(end)
    const text = selected || '텍스트'
    const newContent = before + prefix + text + suffix + after
    setContent(newContent)
    setTimeout(() => {
      textarea.selectionStart = start + prefix.length
      textarea.selectionEnd = start + prefix.length + text.length
      textarea.focus()
    }, 0)
  }

  // ── 마크다운 줄 서식 (현재 줄 앞에 prefix 삽입) ──────────────────────
  const applyLineFormat = (prefix) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const lineStart = content.lastIndexOf('\n', cursorPos - 1) + 1
    const before = content.slice(0, lineStart)
    const rest = content.slice(lineStart)
    const newContent = before + prefix + rest
    setContent(newContent)
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = cursorPos + prefix.length
      textarea.focus()
    }, 0)
  }

  // ── 이미지 업로드 ──────────────────────────────────────────────────────
  const uploadImageFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await uploadImage(formData)
    insertAtCursor(`[image:${res.data.url}]`)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadImageFile(file)
      toast.success('이미지가 삽입되었습니다.')
    } catch (err) {
      toast.error(err.response?.data?.detail || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const imageItems = items.filter((item) => item.type.startsWith('image/'))
    if (imageItems.length === 0) return
    e.preventDefault()
    setUploading(true)
    try {
      for (const item of imageItems) {
        const file = item.getAsFile()
        if (file) await uploadImageFile(file)
      }
      toast.success(
        imageItems.length > 1
          ? `${imageItems.length}개 이미지가 삽입되었습니다.`
          : '이미지가 삽입되었습니다.'
      )
    } catch (err) {
      toast.error(err.response?.data?.detail || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  // ── 드래그 앤 드롭 ─────────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
  }
  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(f.type)
    )
    if (files.length === 0) {
      toast.error('이미지 파일(jpg, png, gif, webp)만 드래그할 수 있습니다.')
      return
    }
    setUploading(true)
    try {
      for (const file of files) await uploadImageFile(file)
      toast.success(files.length > 1 ? `${files.length}개 이미지가 삽입되었습니다.` : '이미지가 삽입되었습니다.')
    } catch (err) {
      toast.error(err.response?.data?.detail || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  // ── 표 모달 ────────────────────────────────────────────────────────────
  const openTableModal = () => {
    setTableCols(3)
    setTableRows(3)
    setTableHeaders(['', '', ''])
    setTableData([['', '', ''], ['', '', ''], ['', '', '']])
    setShowTableModal(true)
  }

  const handleTableColsChange = (newCols) => {
    const n = Math.max(1, Math.min(8, newCols))
    setTableCols(n)
    setTableHeaders((prev) => {
      const arr = [...prev]
      while (arr.length < n) arr.push('')
      return arr.slice(0, n)
    })
    setTableData((prev) =>
      prev.map((row) => {
        const arr = [...row]
        while (arr.length < n) arr.push('')
        return arr.slice(0, n)
      })
    )
  }

  const handleTableRowsChange = (newRows) => {
    const n = Math.max(1, Math.min(20, newRows))
    setTableRows(n)
    setTableData((prev) => {
      const arr = [...prev]
      while (arr.length < n) arr.push(Array(tableCols).fill(''))
      return arr.slice(0, n)
    })
  }

  const handleInsertTable = () => {
    const tableObj = { headers: tableHeaders, rows: tableData }
    const encoded = btoa(encodeURIComponent(JSON.stringify(tableObj)))
    insertAtCursor(`[table:${encoded}]`)
    setShowTableModal(false)
    toast.success('표가 삽입되었습니다.')
  }

  // ── 영상 URL 삽입 ──────────────────────────────────────────────────────
  const handleVideoInsert = () => {
    const url = youtubeInput.trim()
    if (!url) return
    const supportedPattern =
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/|chzzk\.naver\.com\/(?:clips|live|video)\/)/
    if (!supportedPattern.test(url)) {
      toast.error('YouTube 또는 Chzzk URL을 입력해주세요.')
      return
    }
    insertAtCursor(url)
    setYoutubeInput('')
    setShowYoutubeInput(false)
    toast.success('영상이 삽입되었습니다.')
  }

  // ── 제출 ───────────────────────────────────────────────────────────────
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

          {/* ── 카테고리 ── */}
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

          {/* ── 제목 ── */}
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

          {/* ── 내용 ── */}
          <div className="form-group">
            <label className="form-label">내용 *</label>

            {/* 편집 / 미리보기 탭 */}
            <div className="editor-tabs">
              <button
                type="button"
                className={`editor-tab${!showPreview ? ' active' : ''}`}
                onClick={() => setShowPreview(false)}
              >
                <PencilLine size={13} /> 편집
              </button>
              <button
                type="button"
                className={`editor-tab${showPreview ? ' active' : ''}`}
                onClick={() => setShowPreview(true)}
              >
                <Eye size={13} /> 미리보기
              </button>
            </div>

            {showPreview ? (
              /* ── 미리보기 ── */
              <div className="preview-area">
                {content.trim() ? (
                  <ContentRenderer content={content} />
                ) : (
                  <p className="preview-empty">내용을 입력하면 미리보기가 표시됩니다.</p>
                )}
              </div>
            ) : (
              <>
                {/* ── 마크다운 서식 툴바 ── */}
                <div className="formatting-toolbar">
                  <button type="button" className="fmt-btn" title="제목 1" onClick={() => applyLineFormat('# ')}>H1</button>
                  <button type="button" className="fmt-btn" title="제목 2" onClick={() => applyLineFormat('## ')}>H2</button>
                  <button type="button" className="fmt-btn" title="제목 3" onClick={() => applyLineFormat('### ')}>H3</button>
                  <span className="toolbar-sep" />
                  <button type="button" className="fmt-btn" title="굵게" onClick={() => applyInlineFormat('**', '**')}><Bold size={13} /></button>
                  <button type="button" className="fmt-btn" title="기울임" onClick={() => applyInlineFormat('*', '*')}><Italic size={13} /></button>
                  <button type="button" className="fmt-btn" title="취소선" onClick={() => applyInlineFormat('~~', '~~')}><Strikethrough size={13} /></button>
                  <span className="toolbar-sep" />
                  <button type="button" className="fmt-btn" title="인라인 코드" onClick={() => applyInlineFormat('`', '`')}><Code size={13} /></button>
                  <button type="button" className="fmt-btn fmt-btn--mono" title="코드 블록" onClick={() => insertAtCursor('```\n코드\n```')}>```</button>
                  <span className="toolbar-sep" />
                  <button type="button" className="fmt-btn" title="인용" onClick={() => applyLineFormat('> ')}><Quote size={13} /></button>
                  <button type="button" className="fmt-btn" title="목록" onClick={() => applyLineFormat('- ')}><List size={13} /></button>
                  <button type="button" className="fmt-btn" title="번호 목록" onClick={() => applyLineFormat('1. ')}><ListOrdered size={13} /></button>
                  <button type="button" className="fmt-btn" title="구분선" onClick={() => insertAtCursor('---')}><Minus size={13} /></button>
                </div>

                {/* ── 미디어 툴바 ── */}
                <div className="media-toolbar">
                  {/* 이미지 */}
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

                  {/* 표 */}
                  <button
                    type="button"
                    className="media-btn"
                    onClick={openTableModal}
                    title="표 삽입"
                  >
                    <Table2 size={15} />
                    표
                  </button>

                  {/* 이모티콘 */}
                  <div className="emoticon-btn-wrap" ref={emoticonBtnRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className="media-btn"
                      onClick={() => setShowEmoticonPicker((v) => !v)}
                      title="이모티콘 삽입"
                    >
                      <Smile size={15} />
                      이모티콘
                    </button>
                    {showEmoticonPicker && (
                      <EmoticonPicker
                        onSelect={(marker) => {
                          insertAtCursor(marker)
                          setShowEmoticonPicker(false)
                        }}
                        onClose={() => setShowEmoticonPicker(false)}
                      />
                    )}
                  </div>
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
                      onKeyDown={(e) =>
                        e.key === 'Enter' && (e.preventDefault(), handleVideoInsert())
                      }
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

                {/* 텍스트에어리어 */}
                <div
                  className={`textarea-wrap${isDragging ? ' drag-active' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <textarea
                    ref={textareaRef}
                    className="form-input content-textarea"
                    placeholder={'내용을 마크다운으로 작성하세요...\n# 제목  **굵게**  *기울임*  `코드`  > 인용  - 목록\n(이미지 Ctrl+V로 붙여넣기 가능)'}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    rows={16}
                  />
                  {isDragging && (
                    <div className="drag-overlay">
                      <ImagePlus size={32} />
                      <span>이미지를 여기에 놓으세요</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── 제출 버튼 ── */}
          <div className="write-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={15} />
              {submitting ? '처리 중...' : isEdit ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </div>

      {/* ── 표 만들기 모달 ── */}
      {showTableModal && (
        <div className="table-modal-overlay" onClick={() => setShowTableModal(false)}>
          <div className="table-modal" onClick={(e) => e.stopPropagation()}>
            <div className="table-modal-header">
              <h3>표 만들기</h3>
              <button type="button" className="table-modal-close" onClick={() => setShowTableModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="table-modal-controls">
              <label>
                열 수
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={tableCols}
                  onChange={(e) => handleTableColsChange(parseInt(e.target.value) || 1)}
                />
              </label>
              <label>
                행 수
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={tableRows}
                  onChange={(e) => handleTableRowsChange(parseInt(e.target.value) || 1)}
                />
              </label>
            </div>
            <div className="table-modal-grid-wrap">
              <table className="table-modal-grid">
                <thead>
                  <tr>
                    {tableHeaders.map((h, ci) => (
                      <th key={ci}>
                        <input
                          type="text"
                          placeholder={`헤더 ${ci + 1}`}
                          value={h}
                          onChange={(e) => {
                            const arr = [...tableHeaders]
                            arr[ci] = e.target.value
                            setTableHeaders(arr)
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>
                          <input
                            type="text"
                            placeholder={`${ri + 1}행 ${ci + 1}열`}
                            value={cell}
                            onChange={(e) => {
                              const newData = tableData.map((r, rIdx) =>
                                rIdx === ri
                                  ? r.map((c, cIdx) => (cIdx === ci ? e.target.value : c))
                                  : r
                              )
                              setTableData(newData)
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowTableModal(false)}>
                취소
              </button>
              <button type="button" className="btn btn-primary" onClick={handleInsertTable}>
                삽입
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
