import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { Pin } from 'lucide-react'
import { getNotices } from '../../api/posts'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import './NoticeBar.css'

export default function NoticeBar() {
  const { data: notices = [] } = useQuery('notices', getNotices, {
    staleTime: 60_000,
  })

  if (notices.length === 0) return null

  return (
    <div className="notice-bar">
      <div className="notice-bar-header">
        <Pin size={13} className="notice-pin-icon" />
        <span className="notice-bar-label">공지사항</span>
      </div>
      <ul className="notice-list">
        {notices.map((notice) => (
          <li key={notice.id} className="notice-item">
            <Link to={`/posts/${notice.id}`} className="notice-title">
              {notice.title}
            </Link>
            <span className="notice-meta">
              {formatDistanceToNow(new Date(notice.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
