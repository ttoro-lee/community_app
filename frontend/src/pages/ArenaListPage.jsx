import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { getArenas, createArena, searchUsers } from '../api/arena'
import { useAuth } from '../contexts/AuthContext'
import { Swords, Plus, Clock, Users, Crown, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import './ArenaListPage.css'

const STATUS_LABEL = {
  pending:  { text: '대기 중',   cls: 'arena-badge--pending'  },
  active:   { text: '진행 중',   cls: 'arena-badge--active'   },
  finished: { text: '종료',      cls: 'arena-badge--finished' },
  declined: { text: '거절됨',    cls: 'arena-badge--declined' },
}

const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30]

// ── 아레나 생성 모달 ──────────────────────────────────────────────────────────

function CreateArenaModal({ onClose }) {
  const queryClient = useQueryClient()
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [duration, setDuration] = useState(10)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchUsers(searchQ)
        setSearchResults(res)
      } catch { /* ignore */ }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [searchQ])

  const mutation = useMutation(
    () => createArena({ opponent_id: selectedUser.id, duration_minutes: duration }),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('arenas')
        toast.success(`${selectedUser.nickname}님에게 아레나 초대를 보냈습니다!`)
        onClose(data.id)
      },
      onError: (err) => {
        toast.error(err.response?.data?.detail || '아레나 생성 실패')
      },
    }
  )

  return (
    <div className="arena-modal-overlay" onClick={() => onClose(null)}>
      <div className="arena-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="arena-modal-header">
          <Swords size={18} />
          <h3>새 아레나 생성</h3>
          <button className="arena-modal-close" onClick={() => onClose(null)}><X size={16} /></button>
        </div>

        {/* 상대방 검색 */}
        <div className="arena-modal-section">
          <label className="arena-modal-label">상대방 선택</label>
          {selectedUser ? (
            <div className="arena-selected-user">
              <div className="arena-avatar-sm">{selectedUser.nickname[0]}</div>
              <span>{selectedUser.nickname}</span>
              <button className="arena-deselect-btn" onClick={() => setSelectedUser(null)}>
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="arena-user-search-wrap">
              <Search size={14} className="arena-search-icon" />
              <input
                className="arena-user-search-input"
                type="text"
                placeholder="닉네임으로 검색..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                autoFocus
              />
              {searchQ && (
                <div className="arena-search-dropdown">
                  {searching && <div className="arena-search-loading">검색 중...</div>}
                  {!searching && searchResults.length === 0 && (
                    <div className="arena-search-empty">검색 결과가 없습니다</div>
                  )}
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      className="arena-search-item"
                      onClick={() => { setSelectedUser(u); setSearchQ('') }}
                    >
                      <div className="arena-avatar-sm">{u.nickname[0]}</div>
                      <span>{u.nickname}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 시간 선택 */}
        <div className="arena-modal-section">
          <label className="arena-modal-label">아레나 시간</label>
          <div className="arena-duration-grid">
            {DURATION_OPTIONS.map((m) => (
              <button
                key={m}
                className={`arena-duration-btn${duration === m ? ' selected' : ''}`}
                onClick={() => setDuration(m)}
              >
                {m}분
              </button>
            ))}
          </div>
        </div>

        <div className="arena-modal-actions">
          <button className="arena-btn-ghost" onClick={() => onClose(null)}>취소</button>
          <button
            className="arena-btn-primary"
            disabled={!selectedUser || mutation.isLoading}
            onClick={() => mutation.mutate()}
          >
            <Swords size={14} />
            {mutation.isLoading ? '생성 중...' : '아레나 시작'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 아레나 카드 ───────────────────────────────────────────────────────────────

function ArenaCard({ arena }) {
  const badge = STATUS_LABEL[arena.status] || { text: arena.status, cls: '' }
  const totalVotes = arena.creator_votes + arena.opponent_votes

  return (
    <Link to={`/arena/${arena.id}`} className="arena-card">
      <div className="arena-card-top">
        <span className={`arena-badge ${badge.cls}`}>{badge.text}</span>
        <span className="arena-card-time">
          <Clock size={12} /> {arena.duration_minutes}분
        </span>
      </div>

      <div className="arena-card-players">
        <div className="arena-player">
          <div className="arena-avatar">{arena.creator.nickname[0]}</div>
          <span className="arena-player-name">{arena.creator.nickname}</span>
          {arena.status === 'finished' && arena.creator_votes > arena.opponent_votes && (
            <Crown size={14} className="arena-crown" />
          )}
          <span className="arena-vote-count">{arena.creator_votes}표</span>
        </div>

        <div className="arena-vs-badge">VS</div>

        <div className="arena-player arena-player--right">
          <div className="arena-avatar">{arena.opponent.nickname[0]}</div>
          <span className="arena-player-name">{arena.opponent.nickname}</span>
          {arena.status === 'finished' && arena.opponent_votes > arena.creator_votes && (
            <Crown size={14} className="arena-crown" />
          )}
          <span className="arena-vote-count">{arena.opponent_votes}표</span>
        </div>
      </div>

      {totalVotes > 0 && (
        <div className="arena-vote-bar-wrap">
          <div className="arena-vote-bar">
            <div
              className="arena-vote-bar-fill arena-vote-bar-creator"
              style={{ width: `${(arena.creator_votes / totalVotes) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="arena-card-footer">
        <span><Users size={12} /> {arena.message_count ?? 0}개 메시지</span>
      </div>
    </Link>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ArenaListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery(
    ['arenas', page, statusFilter],
    () => getArenas({ page, size: 12, status: statusFilter || undefined }),
    { keepPreviousData: true }
  )

  const handleCreateClose = (newId) => {
    setShowCreate(false)
    if (newId) navigate(`/arena/${newId}`)
  }

  return (
    <div className="arena-list-page fade-in">
      {/* 헤더 */}
      <div className="arena-list-header">
        <div className="arena-list-title-row">
          <Swords size={22} className="arena-title-icon" />
          <h1 className="arena-list-title">아레나</h1>
          <span className="arena-list-subtitle">두 유저가 맞붙는 실시간 토론 배틀</span>
        </div>
        {user && (
          <button className="arena-btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> 아레나 만들기
          </button>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="arena-filter-tabs">
        {[['', '전체'], ['active', '진행 중'], ['pending', '대기 중'], ['finished', '종료']].map(([v, label]) => (
          <button
            key={v}
            className={`arena-filter-tab${statusFilter === v ? ' active' : ''}`}
            onClick={() => { setStatusFilter(v); setPage(1) }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="arena-loading">로딩 중...</div>
      ) : !data?.items?.length ? (
        <div className="arena-empty">
          <Swords size={40} />
          <p>아직 아레나가 없습니다</p>
          {user && (
            <button className="arena-btn-primary" onClick={() => setShowCreate(true)}>
              첫 아레나 만들기
            </button>
          )}
        </div>
      ) : (
        <div className="arena-grid">
          {data.items.map((a) => <ArenaCard key={a.id} arena={a} />)}
        </div>
      )}

      {/* 페이지네이션 */}
      {data && data.pages > 1 && (
        <div className="arena-pagination">
          <button
            className="arena-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="arena-page-info">{page} / {data.pages}</span>
          <button
            className="arena-page-btn"
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {showCreate && <CreateArenaModal onClose={handleCreateClose} />}
    </div>
  )
}
