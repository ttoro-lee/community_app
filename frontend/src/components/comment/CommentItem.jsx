import { useState } from 'react'
import { Heart, Reply, Pencil, Trash2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAuth } from '../../contexts/AuthContext'
import { toggleCommentLike, createComment, updateComment, deleteComment } from '../../api/posts'
import { adminDeleteComment } from '../../api/admin'
import toast from 'react-hot-toast'
import './CommentItem.css'

export default function CommentItem({ comment, onRefresh, depth = 0 }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(comment.is_liked)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
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

  return (
    <div className={`comment-item depth-${depth}`}>
      {depth > 0 && <div className="reply-line" />}
      <div className="comment-body">
        <div className="comment-header">
          <div className="comment-author">
            <div className="avatar-xs">
              {comment.author?.nickname?.charAt(0).toUpperCase()}
            </div>
            <span className="comment-nickname">{comment.author?.nickname}</span>
            <span className="comment-time">{timeAgo}</span>
          </div>
          {isOwner && !comment.is_deleted && (
            <div className="comment-actions">
              <button className="action-btn" onClick={() => setEditing(!editing)}>
                <Pencil size={13} />
              </button>
              <button className="action-btn danger" onClick={handleDelete}>
                <Trash2 size={13} />
              </button>
            </div>
          )}
          {isAdmin && !comment.is_deleted && (
            <div className="comment-actions">
              <button
                className="action-btn danger"
                title="관리자 삭제"
                onClick={handleAdminDelete}
              >
                <ShieldAlert size={13} />
              </button>
            </div>
          )}
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
            {depth === 0 && user && (
              <button
                className="reply-btn"
                onClick={() => setShowReply(!showReply)}
              >
                <Reply size={13} />
                답글
              </button>
            )}
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

        {showReply && (
          <div className="reply-input-area">
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

      {depth === 0 && showReplies && comment.replies?.length > 0 && (
        <div className="replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onRefresh={onRefresh}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
