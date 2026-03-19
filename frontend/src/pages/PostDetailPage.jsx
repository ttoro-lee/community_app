import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import { getPost, getComments, createComment, togglePostLike, deletePost, getAdjacentPosts } from '../api/posts'
import { adminDeletePost, toggleNotice } from '../api/admin'
import { useAuth } from '../contexts/AuthContext'
import CommentItem from '../components/comment/CommentItem'
import ContentRenderer from '../components/post/ContentRenderer'
import EmoticonPicker from '../components/emoticon/EmoticonPicker'
import { Heart, Eye, MessageCircle, Pencil, Trash2, ArrowLeft, ShieldAlert, Pin, PinOff, Smile } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import './PostDetailPage.css'

export default function PostDetailPage() {
  const { postId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showCommentEmoticon, setShowCommentEmoticon] = useState(false)

  const { data: post, isLoading } = useQuery(
    ['post', postId],
    () => getPost(postId).then((r) => r.data),
    {
      onSuccess: (data) => {
        setLiked(data.is_liked)
        setLikeCount(data.like_count)
      },
    }
  )

  const { data: comments = [], refetch: refetchComments } = useQuery(
    ['comments', postId],
    () => getComments(postId).then((r) => r.data)
  )

  const { data: adjacent } = useQuery(
    ['adjacent', postId],
    () => getAdjacentPosts(postId).then((r) => r.data)
  )

  const handleLike = async () => {
    if (!user) { toast.error('로그인이 필요합니다.'); return }
    try {
      const res = await togglePostLike(postId)
      setLiked(res.data.liked)
      setLikeCount(res.data.count)
    } catch {}
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    if (!user) { toast.error('로그인이 필요합니다.'); return }
    try {
      await createComment({ content: newComment, post_id: parseInt(postId) })
      setNewComment('')
      refetchComments()
      toast.success('댓글이 등록되었습니다.')
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제할까요?')) return
    try {
      await deletePost(postId)
      toast.success('게시글이 삭제되었습니다.')
      navigate(-1)
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    }
  }

  const handleAdminDelete = async () => {
    if (!confirm('[관리자] 이 게시글을 강제 삭제할까요?')) return
    try {
      await adminDeletePost(postId)
      toast.success('게시글이 관리자에 의해 삭제되었습니다.')
      navigate(-1)
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    }
  }

  const handleToggleNotice = async () => {
    const isCurrentlyNotice = post.is_notice
    const msg = isCurrentlyNotice
      ? '이 게시글의 공지 등록을 해제할까요?'
      : '이 게시글을 공지사항으로 등록할까요?'
    if (!confirm(msg)) return
    try {
      await toggleNotice(postId, !isCurrentlyNotice)
      toast.success(isCurrentlyNotice ? '공지 등록이 해제되었습니다.' : '공지사항으로 등록되었습니다.')
      queryClient.invalidateQueries(['post', postId])
      queryClient.invalidateQueries('notices')
    } catch (err) {
      toast.error(err.response?.data?.detail || '오류가 발생했습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="post-detail-loading">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-line" style={{ height: i === 0 ? 32 : 16, width: i === 0 ? '70%' : '100%' }} />
        ))}
      </div>
    )
  }

  if (!post) return <div className="empty-state"><p>게시글을 찾을 수 없습니다.</p></div>

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ko })
  const fullDate = format(new Date(post.created_at), 'yyyy년 MM월 dd일 HH:mm')

  return (
    <div className="post-detail-page fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> 목록으로
      </button>

      <article className="post-article">
        {/* Category + Title */}
        <div className="post-meta-top">
          {post.category && (
            <Link to={`/board/${post.category.slug}`} className="post-cat-link">
              {post.category.icon} {post.category.name}
            </Link>
          )}
        </div>
        <h1 className="post-detail-title">{post.title}</h1>

        <div className="post-info-bar">
          <div className="post-author-info">
            <div className="author-avatar">
              {post.author?.nickname?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="author-name-lg">{post.author?.nickname}</div>
              <div className="post-date" title={fullDate}>{timeAgo}</div>
            </div>
          </div>
          <div className="post-stats-bar">
            <span className="stat-item"><Eye size={14} /> {post.view_count}</span>
            <span className="stat-item"><MessageCircle size={14} /> {comments.length}</span>
          </div>
        </div>

        {user?.id === post.user_id && (
          <div className="post-owner-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/posts/${postId}/edit`)}>
              <Pencil size={13} /> 수정
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              <Trash2 size={13} /> 삭제
            </button>
          </div>
        )}
        {user?.is_admin && (
          <div className="post-owner-actions">
            <button
              className={`btn btn-sm ${post.is_notice ? 'btn-secondary' : 'btn-notice'}`}
              onClick={handleToggleNotice}
            >
              {post.is_notice
                ? <><PinOff size={13} /> 공지 해제</>
                : <><Pin size={13} /> 공지 등록</>
              }
            </button>
            {user?.id !== post.user_id && (
              <button className="btn btn-danger btn-sm" onClick={handleAdminDelete}>
                <ShieldAlert size={13} /> 강제 삭제
              </button>
            )}
          </div>
        )}

        <div className="divider" />

        <div className="post-content">
          <ContentRenderer content={post.content} />
        </div>

        <div className="divider" />

        {/* Like Button */}
        <div className="like-section">
          <button
            className={`like-post-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            <span>{likeCount}</span>
            {liked ? '좋아요 취소' : '좋아요'}
          </button>
        </div>
      </article>

      {/* Comments */}
      <section className="comments-section">
        <h2 className="comments-title">
          <MessageCircle size={18} />
          댓글 <span className="comment-count">{post.comment_count ?? comments.length}</span>
        </h2>

        {user ? (
          <form className="comment-form" onSubmit={handleComment}>
            <div className="comment-input-wrapper">
              <div className="author-avatar-sm">
                {user.nickname?.charAt(0).toUpperCase()}
              </div>
              <textarea
                className="form-input"
                placeholder="댓글을 입력하세요..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="comment-submit" style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setShowCommentEmoticon((v) => !v)}
                title="이모티콘"
              >
                <Smile size={14} />
                이모티콘
              </button>
              {showCommentEmoticon && (
                <EmoticonPicker
                  onSelect={(marker) => {
                    setNewComment((prev) => prev + marker)
                    setShowCommentEmoticon(false)
                  }}
                  onClose={() => setShowCommentEmoticon(false)}
                />
              )}
              <button type="submit" className="btn btn-primary btn-sm" disabled={!newComment.trim()}>
                댓글 등록
              </button>
            </div>
          </form>
        ) : (
          <div className="login-prompt">
            <Link to="/login" className="btn btn-primary btn-sm">로그인</Link>
            <span>하고 댓글을 달아보세요.</span>
          </div>
        )}

        <div className="comments-list">
          {comments.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>첫 댓글을 남겨보세요!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onRefresh={refetchComments}
              />
            ))
          )}
        </div>
      </section>

      {/* Adjacent Posts Navigation */}
      {adjacent && (adjacent.prev || adjacent.next) && (
        <nav className="adjacent-posts">
          {adjacent.next && (
            <Link to={`/posts/${adjacent.next.id}`} className="adjacent-post-item adjacent-next">
              <span className="adjacent-label">다음 글</span>
              <span className="adjacent-title">{adjacent.next.title}</span>
            </Link>
          )}
          {adjacent.prev && (
            <Link to={`/posts/${adjacent.prev.id}`} className="adjacent-post-item adjacent-prev">
              <span className="adjacent-label">이전 글</span>
              <span className="adjacent-title">{adjacent.prev.title}</span>
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
