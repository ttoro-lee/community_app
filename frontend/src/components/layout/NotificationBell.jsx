import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../../api/notifications'
import './NotificationBell.css'

const POLL_INTERVAL = 30_000 // 30초마다 미읽음 수 갱신

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  /* ── 미읽음 수 폴링 ── */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount()
      setUnreadCount(res.data.count)
    } catch {
      // 인증 오류 등 무시
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const timer = setInterval(fetchUnreadCount, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchUnreadCount])

  /* ── 드롭다운 열기 ── */
  const handleOpen = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const res = await getNotifications({ limit: 30 })
      setNotifications(res.data)
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  /* ── 바깥 클릭 닫기 ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── 알림 클릭 → 읽음 처리 후 해당 게시글로 이동 ── */
  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      await markAsRead(notif.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    if (notif.post_id) {
      navigate(`/posts/${notif.post_id}`)
    }
    setOpen(false)
  }

  /* ── 전체 읽음 ── */
  const handleMarkAll = async () => {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  /* ── 알림 본문 텍스트 ── */
  const getNotifText = (n) => {
    const actor = n.actor_nickname || '누군가'
    if (n.type === 'comment_on_post') return `${actor}님이 내 글에 댓글을 달았습니다.`
    if (n.type === 'reply_on_comment') return `${actor}님이 내 댓글에 대댓글을 달았습니다.`
    return '새 알림이 있습니다.'
  }

  return (
    <div className="notif-wrap" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={handleOpen} title="알림">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span className="notif-title">알림</span>
            {notifications.some((n) => !n.is_read) && (
              <button className="notif-read-all-btn" onClick={handleMarkAll}>
                모두 읽음
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">불러오는 중...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">알림이 없습니다.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  className={`notif-item${n.is_read ? ' read' : ''}`}
                  onClick={() => handleNotifClick(n)}
                >
                  <div className="notif-item-avatar">
                    {n.actor_avatar_url ? (
                      <img src={n.actor_avatar_url} alt="" />
                    ) : (
                      <span>{(n.actor_nickname || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="notif-item-body">
                    <p className="notif-item-text">{getNotifText(n)}</p>
                    {n.post_title && (
                      <p className="notif-item-post">{n.post_title}</p>
                    )}
                    <p className="notif-item-time">
                      {format(new Date(n.created_at), 'MM.dd HH:mm', { locale: ko })}
                    </p>
                  </div>
                  {!n.is_read && <span className="notif-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
