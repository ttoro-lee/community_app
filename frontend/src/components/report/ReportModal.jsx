import { useState } from 'react'
import { Flag, X } from 'lucide-react'
import { reportPost } from '../../api/reports'
import toast from 'react-hot-toast'
import './ReportModal.css'

export default function ReportModal({ postId, onClose }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) return
    setLoading(true)
    try {
      await reportPost({ post_id: postId, reason: reason.trim() })
      toast.success('신고가 접수되었습니다.')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || '신고 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-title">
            <Flag size={16} />
            게시글 신고
          </div>
          <button className="report-modal-close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <p className="report-modal-desc">
          신고 사유를 입력해 주세요. 관리자가 검토 후 조치합니다.
        </p>

        <form onSubmit={handleSubmit} className="report-modal-form">
          <textarea
            className="report-modal-textarea"
            placeholder="신고 사유를 입력하세요 (예: 욕설/비방, 스팸, 불법 정보 등)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={500}
            autoFocus
          />
          <div className="report-modal-char-count">{reason.length} / 500</div>

          <div className="report-modal-actions">
            <button
              type="button"
              className="report-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="report-btn-submit"
              disabled={!reason.trim() || loading}
            >
              <Flag size={13} />
              {loading ? '신고 중...' : '신고하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
