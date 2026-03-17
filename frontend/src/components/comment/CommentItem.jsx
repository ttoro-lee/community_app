import { useState } from 'react'
import { Heart, Reply, Pencil, Trash2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAuth } from '../../contexts/AuthContext'
import { toggleCommentLike, createComment, updateComment, deleteComment } from '../../api/posts'
import { adminDeleteComment } from '../../api/admin'
import toast from 'react-hot-toast'
import './CommentItem.css'

/**
 * @param {object}  comment         - 댓글 데이터 (replies 포함)
 * @param {func}    onRefresh       - 댓글 목록 새로고침
 * @param {number}  depth           - 현재 댓글의 깊이 (0 = 최상위)
 * @param {string}  parentNickname  - 부모 댓글 작성자 닉네임 (대댓글일 때 @멘션용)
 */
export default function CommentItem({ comment, onRefresh, depth = 0, parentNickname = null }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(comment.is_liked)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  // 최상위 댓글만 접기/펼치기 가능
  const [showReplies, setShowReplies] = useState(true)

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true, locale: ko,
  })

  const handleLike = async () => {
    if (!user) { toast.error('로그인이 필요합니다.'); return }
    try {
      const res = await toggleCommentLike(comment.id)
      setLiked(res.data.liked)
      setLikeCount(res.data.count)
    } catch {}
  }

  const handleReply = async () => {
    if (!replyText.trim()) return
    try {
      await createComment({ content: replyText, post_id: comment.post_id, parent_id: comment.id })
      setReplyText('')
      setShowReply(false)
      onRefresh()
    } catch (e) {
      toast.error(e.response?.data?.detail || '오류가 발생했습니다.')
    }
  }

  const handleEdit = async () => {
    if (!editText.trim()) return
    try {
      await updateComment(comment.id, { content: editText })
      setEditing(false)
      onRefresh()
    } catch (e) {
      toast.error(e.response?.data?.detail || '오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('댓글을 삭제할까요?')) return
    try {
      await deleteComment(comment.id)
      onRefresh()
    } catch (e) {
      toast.error(e.response?.data?.detail || '오류가 발생했습니다.')
    }
  }

  const handleAdminDelete = async () => {
    if (!confirm('[관리자] 이 댓글을 강제 삭제할까요?')) return
    try {
      await adminDeleteComment(comment.id)
      onRefresh()
      toast.success('댓글이 관리자에 의해 삭제되었습니다.')
    } catch (e) {
      toast.error(e.response?.data?.detail || '오류가 발생했습니다.')
    }
  }

  const isOwner = user?.id === comment.user_id
  const isAdmin = user?.is_admin && !isOwner

  // CSS depth는 최대 5까지만 (시각적 들여쓰기 과도한 것 방지)
  const depthClass = `depth-${Math.min(depth, 5)}`

  return (
    <div className={`comment-item ${depthClass}`}>
      <div className="comment-body">
        <div className="comment-header">
          <div className="comment-author">
            <div className="avatar-xs">
              {comment.author?.nickname?.charAt(0).toUpperCase()}
            </div>
            <span className="comment-nickname">{comment.author?.nickname}</span>
            <span className="comment-time">{timeAgo}</span>
          </div>
          <div className="comment-actions">
            {isOwner && !comment.is_deleted && (
              <>
                <button className="action-btn" onClick={() => setEditing(!editing)}>
                  <Pencil size={13} />
                </button>
                <button className="action-btn danger" onClick={handleDelete}>
                  <Trash2 size={13} />
                </button>
              </>
            )}
            {isAdmin && !comment.is_deleted && (
              <button
                className="action-btn danger"
                title="관리자 삭제"
                onClick={handleAdminDelete}
              >
                <ShieldAlert size={13} />
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="edit-area">
            <textarea
              className="form-input"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>저장</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>취소</button>
            </div>
          </div>
        ) : (
          <p className={`comment-content ${comment.is_deleted ? 'deleted' : ''}`}>
            {/* 대댓글이면 @부모닉네임 표시 */}
            {!comment.is_deleted && parentNickname && (
              <span className="comment-mention">@{parentNickname}&nbsp;</span>
            )}
            {comment.is_deleted ? '삭제된 댓글입니다.' : comment.content}
          </p>
        )}

        {!comment.is_deleted && (
          <div className="comment-footer">
            <button
              className={`like-btn ${liked ? 'liked' : ''}`}
              onClick={handleLike}
            >
              <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
              {likeCount > 0 && likeCount}
            </button>

            {/* 모든 depth에서 답글 버튼 표시 */}
            {user && (
              <button
                className="reply-btn"
                onClick={() => setShowReply(!showReply)}
              >
                <Reply size={13} />
                답글
              </button>
            )}

            {/* 접기/펼치기는 최상위(depth=0)만 */}
            {depth === 0 && comment.replies?.length > 0 && (
              <button
                className="toggle-replies-btn"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                답글 {comment.replies.length}개
              </button>
            )}
          </div>
        )}

        {/* 답글 입력창 */}
        {showReply && (
          <div className="reply-input-area">
            <div className="reply-input-target">
              <Reply size={12} />
              <span>@{comment.author?.nickname}</span>에게 답글
            </div>
            <textarea
              className="form-input"
              placeholder="답글을 입력하세요..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleReply}>답글 달기</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowReply(false)}>취소</button>
            </div>
          </div>
        )}
      </div>

      {/* 대댓글 목록 — depth=0은 showReplies 상태 따름, 이하는 항상 표시 */}
      {(depth === 0 ? showReplies : true) && comment.replies?.length > 0 && (
        <div className="replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onRefresh={onRefresh}
              depth={depth + 1}
              parentNickname={comment.author?.nickname}
            />
          ))}
        </div>
      )}
    </div>
  )
}
