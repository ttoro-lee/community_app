import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Users,
  FileText,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  ShieldCheck,
  ShieldOff,
  BarChart2,
  Trophy,
  Save,
  Smile,
  Trash2,
  EyeOff,
  Eye,
  Upload,
  CropIcon,
  LayoutList,
  Plus,
  Pencil,
  X,
  Check,
  Lock,
  Unlock,
  Flag,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminStats,
  getAdminUsers,
  toggleAdminRole,
  suspendUser,
  getBestPostThreshold,
  updateBestPostThreshold,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
} from '../api/admin'
import {
  getAllEmoticons,
  uploadEmoticon,
  deleteEmoticon,
  toggleEmoticon,
} from '../api/emoticons'
import { getReportedPosts, resolveReports } from '../api/reports'
import toast from 'react-hot-toast'
import './AdminPage.css'

// ─── 정지 모달 ────────────────────────────────────────────────────────────────

function SuspendModal({ user, initialDays = 3, onClose, onConfirm }) {
  const [days, setDays] = useState(initialDays)
  const [reason, setReason] = useState(user.suspend_reason || '')

  const isLift = days === 0

  const handleSubmit = (e) => {
    e.preventDefault()
    onConfirm(days, reason)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">
          {isLift ? '정지 해제' : '활동 정지 설정'}
        </h3>
        <p className="modal-subtitle">
          대상: <strong>{user.nickname}</strong> ({user.username})
        </p>

        {/* 현재 정지 정보 표시 */}
        {user.suspended_until && new Date(user.suspended_until) > new Date() && (
          <div className="suspend-current-info">
            <span className="suspend-info-label">현재 정지 해제 일시</span>
            <span className="suspend-info-value">
              {new Date(user.suspended_until).toLocaleString('ko-KR')}
            </span>
            {user.suspend_reason && (
              <>
                <span className="suspend-info-label">사유</span>
                <span className="suspend-info-value">{user.suspend_reason}</span>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="suspend-form">
          <label className="form-label">
            정지 기간
            <select
              className="form-select"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={0}>정지 해제</option>
              <option value={1}>1일</option>
              <option value={3}>3일</option>
              <option value={7}>7일</option>
              <option value={14}>14일</option>
              <option value={30}>30일</option>
              <option value={365}>1년</option>
            </select>
          </label>

          {!isLift && (
            <label className="form-label">
              사유 (선택)
              <input
                className="form-input"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="정지 사유를 입력하세요"
                maxLength={100}
              />
            </label>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              취소
            </button>
            <button
              type="submit"
              className={isLift ? 'btn-success' : 'btn-danger'}
            >
              {isLift ? '정지 해제 확인' : `${days}일 정지`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── 이미지 크롭 모달 ─────────────────────────────────────────────────────────

const CROP_SIZE = 200

function ImageCropModal({ file, onConfirm, onCancel }) {
  const containerRef = useRef(null)
  const [imgEl, setImgEl] = useState(null)
  const [scale, setScale] = useState(1)
  const [displayW, setDisplayW] = useState(0)
  const [displayH, setDisplayH] = useState(0)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 })

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const MAX = 480
      const s = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight))
      setScale(s)
      setDisplayW(img.naturalWidth * s)
      setDisplayH(img.naturalHeight * s)
      // 이미지 중앙에 크롭 박스 초기 위치
      setCropX(Math.max(0, Math.floor((img.naturalWidth - CROP_SIZE) / 2)))
      setCropY(Math.max(0, Math.floor((img.naturalHeight - CROP_SIZE) / 2)))
      setImgEl(img)
    }
    img.src = URL.createObjectURL(file)
    return () => URL.revokeObjectURL(img.src)
  }, [file])

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(true)
      dragStart.current = { mx: e.clientX, my: e.clientY, ox: cropX, oy: cropY }
    },
    [cropX, cropY]
  )

  const onMouseMove = useCallback(
    (e) => {
      if (!dragging || !imgEl) return
      const dx = (e.clientX - dragStart.current.mx) / scale
      const dy = (e.clientY - dragStart.current.my) / scale
      setCropX(clamp(dragStart.current.ox + dx, 0, imgEl.naturalWidth - CROP_SIZE))
      setCropY(clamp(dragStart.current.oy + dy, 0, imgEl.naturalHeight - CROP_SIZE))
    },
    [dragging, imgEl, scale]
  )

  const onMouseUp = useCallback(() => setDragging(false), [])

  // 터치 이벤트
  const onTouchStart = useCallback(
    (e) => {
      e.preventDefault()
      const t = e.touches[0]
      setDragging(true)
      dragStart.current = { mx: t.clientX, my: t.clientY, ox: cropX, oy: cropY }
    },
    [cropX, cropY]
  )

  const onTouchMove = useCallback(
    (e) => {
      if (!dragging || !imgEl) return
      const t = e.touches[0]
      const dx = (t.clientX - dragStart.current.mx) / scale
      const dy = (t.clientY - dragStart.current.my) / scale
      setCropX(clamp(dragStart.current.ox + dx, 0, imgEl.naturalWidth - CROP_SIZE))
      setCropY(clamp(dragStart.current.oy + dy, 0, imgEl.naturalHeight - CROP_SIZE))
    },
    [dragging, imgEl, scale]
  )

  const handleCrop = () => {
    if (!imgEl) return
    const canvas = document.createElement('canvas')
    canvas.width = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      imgEl,
      Math.round(cropX), Math.round(cropY), CROP_SIZE, CROP_SIZE,
      0, 0, CROP_SIZE, CROP_SIZE
    )
    canvas.toBlob((blob) => onConfirm(blob), 'image/png')
  }

  const cropDisplaySize = CROP_SIZE * scale

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-box crop-modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">이미지 크롭 (200×200)</h3>
        <p className="modal-subtitle">
          흰색 박스를 드래그해서 원하는 영역을 선택하세요.
        </p>

        {imgEl ? (
          <div
            ref={containerRef}
            className="crop-container"
            style={{ width: displayW, height: displayH }}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseUp}
          >
            <img
              src={imgEl.src}
              alt="원본"
              style={{ width: displayW, height: displayH, display: 'block' }}
              draggable={false}
            />
            {/* 어두운 오버레이 */}
            <div
              className="crop-overlay"
              style={{ width: displayW, height: displayH }}
            />
            {/* 크롭 선택 박스 */}
            <div
              className="crop-box"
              style={{
                left: cropX * scale,
                top: cropY * scale,
                width: cropDisplaySize,
                height: cropDisplaySize,
                cursor: dragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >
              {/* 코너 핸들 */}
              <span className="crop-corner tl" />
              <span className="crop-corner tr" />
              <span className="crop-corner bl" />
              <span className="crop-corner br" />
            </div>
          </div>
        ) : (
          <div className="crop-loading">이미지 로딩 중...</div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn-ghost" onClick={onCancel}>취소</button>
          <button className="btn-success" onClick={handleCrop} disabled={!imgEl}>
            크롭 완료
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 게시판 카테고리 관리 섹션 ────────────────────────────────────────────────

const EMPTY_FORM = { name: '', slug: '', description: '', icon: '📋', order: 0, admin_only: false }

function CategorySection() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})

  const { data: categories = [], isLoading } = useQuery('adminCategories', getAdminCategories, {
    staleTime: 30_000,
  })

  const createMutation = useMutation((data) => createAdminCategory(data), {
    onSuccess: () => {
      queryClient.invalidateQueries('adminCategories')
      queryClient.invalidateQueries('categories')
      setForm(EMPTY_FORM)
      setShowAddForm(false)
      toast.success('카테고리가 추가되었습니다.')
    },
    onError: (err) => toast.error(err.response?.data?.detail || '추가 실패'),
  })

  const updateMutation = useMutation(({ id, data }) => updateAdminCategory(id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('adminCategories')
      queryClient.invalidateQueries('categories')
      setEditId(null)
      toast.success('수정되었습니다.')
    },
    onError: (err) => toast.error(err.response?.data?.detail || '수정 실패'),
  })

  const deleteMutation = useMutation((id) => deleteAdminCategory(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('adminCategories')
      queryClient.invalidateQueries('categories')
      toast.success('삭제되었습니다.')
    },
    onError: (err) => toast.error(err.response?.data?.detail || '삭제 실패'),
  })

  const toggleActiveMutation = useMutation(
    ({ id, is_active }) => updateAdminCategory(id, { is_active }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminCategories')
        queryClient.invalidateQueries('categories')
      },
      onError: (err) => toast.error(err.response?.data?.detail || '변경 실패'),
    }
  )

  const handleAddSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('카테고리 이름을 입력해주세요.'); return }
    if (!form.slug.trim()) { toast.error('슬러그를 입력해주세요.'); return }
    createMutation.mutate(form)
  }

  const startEdit = (cat) => {
    setEditId(cat.id)
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '📋',
      order: cat.order,
      admin_only: cat.admin_only,
    })
  }

  const handleEditSubmit = (id) => {
    if (!editForm.name?.trim()) { toast.error('이름을 입력해주세요.'); return }
    updateMutation.mutate({ id, data: editForm })
  }

  const slugify = (name) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">
          <LayoutList size={16} />
          게시판 카테고리 관리
        </h2>
        <button
          className="best-setting-btn"
          onClick={() => { setShowAddForm((v) => !v); setForm(EMPTY_FORM) }}
        >
          <Plus size={14} />
          카테고리 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <form className="category-add-form" onSubmit={handleAddSubmit}>
          <div className="category-form-row">
            <input
              className="form-input cat-icon-input"
              type="text"
              placeholder="아이콘"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              maxLength={4}
            />
            <input
              className="form-input cat-name-input"
              type="text"
              placeholder="카테고리 이름 *"
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((f) => ({ ...f, name, slug: slugify(name) }))
              }}
              maxLength={100}
              required
            />
            <input
              className="form-input cat-slug-input"
              type="text"
              placeholder="슬러그 (영문) *"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              maxLength={100}
              required
            />
            <input
              className="form-input cat-order-input"
              type="number"
              placeholder="순서"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
              min={0}
            />
            <label className="cat-admin-only-label">
              <input
                type="checkbox"
                checked={form.admin_only}
                onChange={(e) => setForm((f) => ({ ...f, admin_only: e.target.checked }))}
              />
              관리자 전용
            </label>
          </div>
          <div className="category-form-row">
            <input
              className="form-input cat-desc-input"
              type="text"
              placeholder="설명 (선택)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              maxLength={200}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="submit" className="best-setting-btn" disabled={createMutation.isLoading}>
                <Check size={14} />
                {createMutation.isLoading ? '추가 중...' : '추가'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: '7px 12px', fontSize: 13 }}
                onClick={() => setShowAddForm(false)}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 카테고리 목록 */}
      {isLoading ? (
        <p className="emoticon-loading">불러오는 중...</p>
      ) : categories.length === 0 ? (
        <p className="emoticon-empty">등록된 카테고리가 없습니다.</p>
      ) : (
        <div className="category-table-wrap">
          <table className="user-table category-table">
            <thead>
              <tr>
                <th>아이콘</th>
                <th>이름</th>
                <th>슬러그</th>
                <th>설명</th>
                <th style={{ textAlign: 'center' }}>순서</th>
                <th style={{ textAlign: 'center' }}>게시글</th>
                <th style={{ textAlign: 'center' }}>전용</th>
                <th style={{ textAlign: 'center' }}>상태</th>
                <th style={{ textAlign: 'center' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) =>
                editId === cat.id ? (
                  /* 인라인 편집 행 */
                  <tr key={cat.id} className="category-edit-row">
                    <td>
                      <input
                        className="form-input cat-icon-input-sm"
                        value={editForm.icon}
                        onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                        maxLength={4}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{ width: '100%', minWidth: 100 }}
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        maxLength={100}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{ width: '100%', minWidth: 80 }}
                        value={editForm.slug}
                        onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                        maxLength={100}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{ width: '100%', minWidth: 120 }}
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        maxLength={200}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        type="number"
                        style={{ width: 60, textAlign: 'center' }}
                        value={editForm.order}
                        onChange={(e) => setEditForm((f) => ({ ...f, order: Number(e.target.value) }))}
                        min={0}
                      />
                    </td>
                    <td className="td-num">{cat.post_count}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={editForm.admin_only}
                        onChange={(e) => setEditForm((f) => ({ ...f, admin_only: e.target.checked }))}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {cat.is_active ? (
                        <span className="badge-active">활성</span>
                      ) : (
                        <span className="badge-suspended">비활성</span>
                      )}
                    </td>
                    <td className="td-actions" style={{ justifyContent: 'center' }}>
                      <button
                        className="action-btn action-unsuspend"
                        title="저장"
                        onClick={() => handleEditSubmit(cat.id)}
                        disabled={updateMutation.isLoading}
                      >
                        <Check size={13} />
                      </button>
                      <button
                        className="action-btn"
                        title="취소"
                        onClick={() => setEditId(null)}
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ) : (
                  /* 일반 행 */
                  <tr key={cat.id} className={cat.is_active ? '' : 'category-inactive-row'}>
                    <td style={{ fontSize: 20, textAlign: 'center' }}>{cat.icon}</td>
                    <td className="td-nickname">{cat.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{cat.slug}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.description || '-'}</td>
                    <td className="td-num">{cat.order}</td>
                    <td className="td-num">{cat.post_count}</td>
                    <td style={{ textAlign: 'center' }}>
                      {cat.admin_only ? (
                        <Lock size={13} style={{ color: '#f97316', margin: 'auto' }} />
                      ) : (
                        <Unlock size={13} style={{ color: 'var(--text-muted)', margin: 'auto' }} />
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {cat.is_active ? (
                        <span className="badge-active">활성</span>
                      ) : (
                        <span className="badge-suspended">비활성</span>
                      )}
                    </td>
                    <td className="td-actions" style={{ justifyContent: 'center' }}>
                      <button
                        className="action-btn action-promote"
                        title="수정"
                        onClick={() => startEdit(cat)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className={`action-btn ${cat.is_active ? '' : 'action-unsuspend'}`}
                        title={cat.is_active ? '비활성화' : '활성화'}
                        onClick={() => toggleActiveMutation.mutate({ id: cat.id, is_active: !cat.is_active })}
                      >
                        {cat.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        className="action-btn action-suspend"
                        title="삭제"
                        onClick={() => {
                          if (cat.post_count > 0) {
                            toast.error(`게시글이 ${cat.post_count}개 있어 삭제할 수 없습니다.`)
                            return
                          }
                          if (confirm(`"${cat.name}" 카테고리를 삭제할까요?`)) {
                            deleteMutation.mutate(cat.id)
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── 이모티콘 관리 섹션 ────────────────────────────────────────────────────────

function EmoticonSection() {
  const queryClient = useQueryClient()
  const [emName, setEmName] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [needsCrop, setNeedsCrop] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [croppedBlob, setCroppedBlob] = useState(null)
  const fileInputRef = useRef(null)

  const { data: emoticons = [], isLoading } = useQuery('allEmoticons', getAllEmoticons, {
    staleTime: 30_000,
  })

  const uploadMutation = useMutation(
    (formData) => uploadEmoticon(formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('allEmoticons')
        queryClient.invalidateQueries('emoticons')
        setEmName('')
        setSelectedFile(null)
        setPreviewUrl(null)
        setCroppedBlob(null)
        setNeedsCrop(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        toast.success('이모티콘이 등록되었습니다.')
      },
      onError: (err) => toast.error(err.response?.data?.detail || '등록 실패'),
    }
  )

  const deleteMutation = useMutation(
    (id) => deleteEmoticon(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('allEmoticons')
        queryClient.invalidateQueries('emoticons')
        toast.success('삭제되었습니다.')
      },
    }
  )

  const toggleMutation = useMutation(
    (id) => toggleEmoticon(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('allEmoticons')
        queryClient.invalidateQueries('emoticons')
      },
    }
  )

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setCroppedBlob(null)

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const tooLarge = img.naturalWidth > CROP_SIZE || img.naturalHeight > CROP_SIZE
      setNeedsCrop(tooLarge)
      setPreviewUrl(url)
      if (tooLarge) setShowCropModal(true)
    }
    img.src = url
  }

  const handleCropConfirm = (blob) => {
    setCroppedBlob(blob)
    setShowCropModal(false)
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    toast.success('크롭 완료! 이제 등록 버튼을 눌러주세요.')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!emName.trim()) { toast.error('이모티콘 이름을 입력해주세요.'); return }
    if (!selectedFile && !croppedBlob) { toast.error('이미지를 선택해주세요.'); return }
    if (needsCrop && !croppedBlob) { toast.error('이미지 크롭을 완료해주세요.'); return }

    const formData = new FormData()
    formData.append('name', emName.trim())
    if (croppedBlob) {
      formData.append('file', croppedBlob, `${Date.now()}.png`)
    } else {
      formData.append('file', selectedFile)
    }
    uploadMutation.mutate(formData)
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">
          <Smile size={16} />
          이모티콘 관리
        </h2>
      </div>

      {/* 등록 폼 */}
      <form className="emoticon-upload-form" onSubmit={handleSubmit}>
        <div className="emoticon-upload-row">
          <input
            className="form-input emoticon-name-input"
            type="text"
            placeholder="이모티콘 이름"
            value={emName}
            onChange={(e) => setEmName(e.target.value)}
            maxLength={50}
          />
          <button
            type="button"
            className="btn-ghost emoticon-file-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
            이미지 선택
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {selectedFile && needsCrop && !croppedBlob && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowCropModal(true)}
              style={{ color: '#f97316', borderColor: '#f97316' }}
            >
              <CropIcon size={14} />
              크롭 필요
            </button>
          )}
          {previewUrl && (
            <div className="emoticon-preview-wrap">
              <img src={previewUrl} alt="미리보기" className="emoticon-preview-img" />
              {croppedBlob && <span className="emoticon-cropped-label">✓ 크롭됨</span>}
            </div>
          )}
          <button
            type="submit"
            className="best-setting-btn"
            disabled={uploadMutation.isLoading}
          >
            <Save size={14} />
            {uploadMutation.isLoading ? '등록 중...' : '등록'}
          </button>
        </div>
        <p className="emoticon-upload-hint">
          이미지는 200×200 px 권장. 큰 이미지는 자동으로 크롭 창이 열립니다.
        </p>
      </form>

      {/* 이모티콘 목록 */}
      {isLoading ? (
        <p className="emoticon-loading">불러오는 중...</p>
      ) : emoticons.length === 0 ? (
        <p className="emoticon-empty">등록된 이모티콘이 없습니다.</p>
      ) : (
        <div className="emoticon-admin-grid">
          {emoticons.map((em) => (
            <div key={em.id} className={`emoticon-admin-item ${em.is_active ? '' : 'inactive'}`}>
              <img src={em.image_url} alt={em.name} />
              <span className="emoticon-admin-name">{em.name}</span>
              <div className="emoticon-admin-actions">
                <button
                  className="action-btn"
                  title={em.is_active ? '비활성화' : '활성화'}
                  onClick={() => toggleMutation.mutate(em.id)}
                >
                  {em.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  className="action-btn action-suspend"
                  title="삭제"
                  onClick={() => {
                    if (confirm(`"${em.name}" 이모티콘을 삭제할까요?`)) {
                      deleteMutation.mutate(em.id)
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 크롭 모달 */}
      {showCropModal && selectedFile && (
        <ImageCropModal
          file={selectedFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </div>
  )
}

// ─── 신고 관리 섹션 ───────────────────────────────────────────────────────────

function ReportsSection() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [includeResolved, setIncludeResolved] = useState(false)
  const [expandedPostId, setExpandedPostId] = useState(null)

  const { data, isLoading } = useQuery(
    ['adminReports', page, includeResolved],
    () => getReportedPosts({ page, size: 20, include_resolved: includeResolved }),
    { keepPreviousData: true }
  )

  const resolveMutation = useMutation(
    (postId) => resolveReports(postId),
    {
      onSuccess: (res) => {
        queryClient.invalidateQueries('adminReports')
        toast.success(`신고 ${res.resolved_count}건이 처리되었습니다.`)
      },
      onError: () => toast.error('처리 중 오류가 발생했습니다.'),
    }
  )

  const totalPages = data ? data.pages : 1

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">
          <Flag size={16} />
          신고 관리
          {data && data.total > 0 && (
            <span className="report-badge">{data.total}</span>
          )}
        </h2>
        <label className="report-resolved-toggle">
          <input
            type="checkbox"
            checked={includeResolved}
            onChange={(e) => { setIncludeResolved(e.target.checked); setPage(1) }}
          />
          처리 완료 포함
        </label>
      </div>

      {isLoading ? (
        <p className="emoticon-loading">불러오는 중...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="emoticon-empty">
          {includeResolved ? '신고된 게시글이 없습니다.' : '미처리 신고가 없습니다.'}
        </p>
      ) : (
        <div className="report-table-wrap">
          <table className="user-table report-table">
            <thead>
              <tr>
                <th>게시글</th>
                <th>작성자</th>
                <th style={{ textAlign: 'center' }}>신고 수</th>
                <th style={{ textAlign: 'center' }}>미처리</th>
                <th>최근 신고</th>
                <th style={{ textAlign: 'center' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <>
                  <tr
                    key={item.post_id}
                    className={`report-row ${item.post_is_deleted ? 'report-row-deleted' : ''}`}
                  >
                    <td className="report-post-title-cell">
                      <button
                        className="report-expand-btn"
                        onClick={() => setExpandedPostId(expandedPostId === item.post_id ? null : item.post_id)}
                        title="신고 내역 펼치기"
                      >
                        {expandedPostId === item.post_id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <span
                        className={`report-post-title ${item.post_is_deleted ? 'deleted-title' : ''}`}
                        title={item.post_title}
                      >
                        {item.post_is_deleted && <span className="deleted-badge">삭제됨</span>}
                        {item.post_title}
                      </span>
                      {!item.post_is_deleted && (
                        <button
                          className="report-goto-btn"
                          onClick={() => navigate(`/posts/${item.post_id}`)}
                          title="게시글로 이동"
                        >
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </td>
                    <td className="td-nickname">{item.author_nickname || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="report-count-badge">{item.report_count}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.unresolved_count > 0 ? (
                        <span className="badge-suspended">{item.unresolved_count}</span>
                      ) : (
                        <span className="badge-active">완료</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(item.latest_report_at)}
                    </td>
                    <td className="td-actions" style={{ justifyContent: 'center' }}>
                      {item.unresolved_count > 0 && (
                        <button
                          className="action-btn action-unsuspend"
                          title="신고 처리 완료"
                          onClick={() => {
                            if (confirm(`"${item.post_title}" 게시글의 신고 ${item.unresolved_count}건을 처리 완료로 표시할까요?`)) {
                              resolveMutation.mutate(item.post_id)
                            }
                          }}
                          disabled={resolveMutation.isLoading}
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedPostId === item.post_id && (
                    <tr key={`${item.post_id}-detail`} className="report-detail-row">
                      <td colSpan={6}>
                        <div className="report-detail-list">
                          <div className="report-detail-header">신고 내역 ({item.reports.length}건)</div>
                          {item.reports.map((r) => (
                            <div key={r.id} className={`report-detail-item ${r.is_resolved ? 'resolved' : ''}`}>
                              <div className="report-detail-meta">
                                <span className="report-detail-reporter">
                                  {r.reporter?.nickname || '알 수 없음'}
                                  <span className="report-detail-username">(@{r.reporter?.username || '-'})</span>
                                </span>
                                <span className="report-detail-date">{formatDate(r.created_at)}</span>
                                {r.is_resolved && <span className="report-resolved-tag">처리완료</span>}
                              </div>
                              <div className="report-detail-reason">{r.reason}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2)
            .map((p) => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user: me, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [thresholdInput, setThresholdInput] = useState('')
  const [thresholdSaved, setThresholdSaved] = useState(false)

  // 인증 로딩이 끝난 후에만 권한 확인 (훅 이후에 배치)
  useEffect(() => {
    if (!authLoading && !me?.is_admin) {
      navigate('/', { replace: true })
    }
  }, [authLoading, me, navigate])

  const { data: stats } = useQuery('adminStats', getAdminStats, {
    staleTime: 30_000,
    enabled: !!me?.is_admin,
  })

  const { data: usersData, isLoading } = useQuery(
    ['adminUsers', page, search],
    () => getAdminUsers({ page, size: 20, search }),
    { keepPreviousData: true, enabled: !!me?.is_admin }
  )

  const { data: thresholdData } = useQuery(
    'bestPostThreshold',
    getBestPostThreshold,
    {
      staleTime: 60_000,
      enabled: !!me?.is_admin,
      onSuccess: (data) => {
        setThresholdInput(String(data.best_post_min_likes))
      },
    }
  )

  const thresholdMutation = useMutation(
    (minLikes) => updateBestPostThreshold(minLikes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bestPostThreshold')
        setThresholdSaved(true)
        setTimeout(() => setThresholdSaved(false), 2000)
      },
    }
  )

  const handleThresholdSave = (e) => {
    e.preventDefault()
    const val = parseInt(thresholdInput, 10)
    if (isNaN(val) || val < 1) return
    thresholdMutation.mutate(val)
  }

  const toggleAdminMutation = useMutation(
    ({ userId, isAdmin }) => toggleAdminRole(userId, isAdmin),
    {
      onSuccess: () => queryClient.invalidateQueries('adminUsers'),
    }
  )

  const suspendMutation = useMutation(
    ({ userId, days, reason }) => suspendUser(userId, days, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers')
        setSuspendTarget(null)
      },
    }
  )

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const totalPages = usersData ? Math.ceil(usersData.total / 20) : 1

  const isSuspended = (u) => {
    if (!u.suspended_until) return false
    return new Date(u.suspended_until) > new Date()
  }

  // 인증 로딩 중이거나 권한 없으면 아무것도 렌더링하지 않음
  if (authLoading || !me?.is_admin) {
    return null
  }

  return (
    <div className="admin-page">
      {/* 헤더 */}
      <div className="admin-header">
        <div className="admin-title-wrap">
          <Shield size={22} />
          <h1 className="admin-title">관리자 패널</h1>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <BarChart2 size={18} className="stat-icon blue" />
            <div>
              <div className="stat-value">{stats.total_users.toLocaleString()}</div>
              <div className="stat-label">전체 회원</div>
            </div>
          </div>
          <div className="stat-card">
            <FileText size={18} className="stat-icon green" />
            <div>
              <div className="stat-value">{stats.total_posts.toLocaleString()}</div>
              <div className="stat-label">전체 게시글</div>
            </div>
          </div>
          <div className="stat-card">
            <MessageSquare size={18} className="stat-icon purple" />
            <div>
              <div className="stat-value">{stats.total_comments.toLocaleString()}</div>
              <div className="stat-label">전체 댓글</div>
            </div>
          </div>
          <div className="stat-card">
            <Users size={18} className="stat-icon orange" />
            <div>
              <div className="stat-value">{stats.admin_users.toLocaleString()}</div>
              <div className="stat-label">관리자 수</div>
            </div>
          </div>
        </div>
      )}

      {/* 유저 목록 */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">
            <Users size={16} />
            회원 관리
          </h2>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input
                className="search-input"
                type="text"
                placeholder="닉네임 / 이메일 검색"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary btn-sm">검색</button>
          </form>
        </div>

        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>닉네임</th>
                <th>아이디</th>
                <th>이메일</th>
                <th>게시글</th>
                <th>댓글</th>
                <th>상태</th>
                <th>관리자</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="table-empty">로딩 중...</td>
                </tr>
              ) : usersData?.items?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty">검색 결과가 없습니다.</td>
                </tr>
              ) : (
                usersData?.items?.map((u) => (
                  <tr key={u.id} className={u.id === me.id ? 'row-me' : ''}>
                    <td className="td-id">{u.id}</td>
                    <td className="td-nickname">
                      {u.nickname}
                      {u.is_super_admin && (
                        <span className="badge-super">슈퍼</span>
                      )}
                    </td>
                    <td className="td-username">{u.username}</td>
                    <td className="td-email">{u.email}</td>
                    <td className="td-num">{u.post_count}</td>
                    <td className="td-num">{u.comment_count}</td>
                    <td>
                      {isSuspended(u) ? (
                        <span className="badge-suspended">
                          정지중
                        </span>
                      ) : (
                        <span className="badge-active">정상</span>
                      )}
                    </td>
                    <td>
                      {u.is_super_admin ? (
                        <span className="badge-super-admin">슈퍼관리자</span>
                      ) : u.is_admin ? (
                        <span className="badge-admin">관리자</span>
                      ) : (
                        <span className="badge-user">일반</span>
                      )}
                    </td>
                    <td className="td-actions">
                      {/* 나 자신, 슈퍼 어드민 대상 액션 제한 */}
                      {u.id !== me.id && !u.is_super_admin && (
                        <>
                          {/* 정지/해제 */}
                          <button
                            className={`action-btn ${isSuspended(u) ? 'action-unsuspend' : 'action-suspend'}`}
                            title={isSuspended(u) ? '정지 해제' : '활동 정지'}
                            onClick={() => setSuspendTarget({ user: u, initialDays: isSuspended(u) ? 0 : 3 })}
                          >
                            {isSuspended(u) ? (
                              <UserCheck size={14} />
                            ) : (
                              <UserX size={14} />
                            )}
                          </button>

                          {/* 관리자 토글 — 슈퍼 어드민만 */}
                          {me.is_super_admin && (
                            <button
                              className={`action-btn ${u.is_admin ? 'action-demote' : 'action-promote'}`}
                              title={u.is_admin ? '관리자 해제' : '관리자 지정'}
                              onClick={() =>
                                toggleAdminMutation.mutate({
                                  userId: u.id,
                                  isAdmin: !u.is_admin,
                                })
                              }
                            >
                              {u.is_admin ? (
                                <ShieldOff size={14} />
                              ) : (
                                <ShieldCheck size={14} />
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <button
                  key={p}
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 베스트 게시글 설정 */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h2 className="admin-section-title">
            <Trophy size={16} />
            베스트 게시글 설정
          </h2>
        </div>
        <div className="best-setting-box">
          <p className="best-setting-desc">
            공지를 제외한 게시글 중 좋아요 수가 아래 기준 이상인 글이 <strong>베스트 게시글</strong> 카테고리에 자동으로 등록됩니다.
          </p>
          <form className="best-setting-form" onSubmit={handleThresholdSave}>
            <label className="form-label best-setting-label">
              최소 좋아요 수
              <div className="best-setting-input-wrap">
                <input
                  type="number"
                  className="form-input best-setting-input"
                  min={1}
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  placeholder="예: 10"
                />
                <span className="best-setting-unit">개 이상</span>
              </div>
            </label>
            <button
              type="submit"
              className={`btn-primary btn-sm best-setting-btn ${thresholdSaved ? 'saved' : ''}`}
              disabled={thresholdMutation.isLoading}
            >
              <Save size={14} />
              {thresholdSaved ? '저장됨 ✓' : '저장'}
            </button>
          </form>
          {thresholdData && (
            <p className="best-setting-current">
              현재 기준: <strong>{thresholdData.best_post_min_likes}개</strong> 이상
            </p>
          )}
        </div>
      </div>

      {/* 신고 관리 */}
      <ReportsSection />

      {/* 게시판 카테고리 관리 */}
      <CategorySection />

      {/* 이모티콘 관리 */}
      <EmoticonSection />

      {/* 정지 모달 */}
      {suspendTarget && (
        <SuspendModal
          user={suspendTarget.user}
          initialDays={suspendTarget.initialDays}
          onClose={() => setSuspendTarget(null)}
          onConfirm={(days, reason) =>
            suspendMutation.mutate({ userId: suspendTarget.user.id, days, reason })
          }
        />
      )}
    </div>
  )
}
