import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Eye, Pin, ImageIcon, Video, Smile } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import './PostCard.css'

function getVideoLabel(text) {
  const t = text.trim()
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\//.test(t)) return 'YouTube'
  if (/chzzk\.naver\.com\/clips\//.test(t)) return 'Chzzk 클립'
  if (/chzzk\.naver\.com\/live\//.test(t)) return 'Chzzk 라이브'
  if (/chzzk\.naver\.com\/video\//.test(t)) return 'Chzzk VOD'
  return null
}

function parseContentPreview(content) {
  const lines = content.split('\n')
  const textParts = []
  let imageCount = 0
  let emoticonCount = 0
  const videoLabels = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('[image:') && trimmed.endsWith(']')) {
      imageCount++
    } else if (trimmed.startsWith('[emoticon:') && trimmed.endsWith(']')) {
      emoticonCount++
    } else {
      const label = getVideoLabel(trimmed)
      if (label) {
        if (!videoLabels.includes(label)) videoLabels.push(label)
      } else if (trimmed) {
        textParts.push(trimmed)
      }
    }
  }

  const textPreview = textParts.join(' ').replace(/[#*`>\-\[\]]/g, '').slice(0, 120)
  return { textPreview, imageCount, emoticonCount, videoLabels }
}

export default function PostCard({ post }) {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ko,
  })

  const { textPreview, imageCount, emoticonCount, videoLabels } = parseContentPreview(post.content)
  const hasMedia = imageCount > 0 || emoticonCount > 0 || videoLabels.length > 0

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
        {textPreview && (
          <p className="post-preview">
            {textPreview}{textPreview.length >= 120 ? '…' : ''}
          </p>
        )}
        {hasMedia && (
          <div className="post-media-badges">
            {imageCount > 0 && (
              <span className="media-badge media-badge-image">
                <ImageIcon size={11} />
                사진{imageCount > 1 ? ` ${imageCount}장` : ''}
              </span>
            )}
            {emoticonCount > 0 && (
              <span className="media-badge media-badge-emoticon">
                <Smile size={11} />
                이모티콘{emoticonCount > 1 ? ` ${emoticonCount}개` : ''}
              </span>
            )}
            {videoLabels.map((label) => (
              <span key={label} className="media-badge media-badge-video">
                <Video size={11} />
                {label}
              </span>
            ))}
          </div>
        )}
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
