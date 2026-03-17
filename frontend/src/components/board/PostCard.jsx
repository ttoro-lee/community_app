import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Eye, Pin } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import './PostCard.css'

export default function PostCard({ post }) {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ko,
  })

  const preview = post.content.replace(/[#*`>\-\[\]]/g, '').slice(0, 120)

  return (
    <article className={`post-card fade-in ${post.is_pinned ? 'pinned' : ''}`}>
      <div className="post-card-header">
        {post.is_pinned && (
          <span className="pin-badge">
            <Pin size={11} /> 공지
          </span>
        )}
        {post.category && (
          <Link
            to={`/board/${post.category.slug}`}
            className="post-category-badge"
          >
            {post.category.icon} {post.category.name}
          </Link>
        )}
      </div>

      <Link to={`/posts/${post.id}`} className="post-card-link">
        <h2 className="post-title">{post.title}</h2>
        {preview && <p className="post-preview">{preview}…</p>}
      </Link>

      <div className="post-card-footer">
        <div className="post-author">
          <div className="author-avatar-sm">
            {post.author?.nickname?.charAt(0).toUpperCase()}
          </div>
          <span className="author-name">{post.author?.nickname}</span>
          <span className="post-time">{timeAgo}</span>
        </div>
        <div className="post-stats">
          <span className="stat">
            <Eye size={13} /> {post.view_count}
          </span>
          <span className="stat">
            <Heart size={13} /> {post.like_count}
          </span>
          <span className="stat">
            <MessageCircle size={13} /> {post.comment_count}
          </span>
        </div>
      </div>
    </article>
  )
}
