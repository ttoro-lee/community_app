import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminStats,
  getAdminUsers,
  toggleAdminRole,
  suspendUser,
} from '../api/admin'
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

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user: me, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [suspendTarget, setSuspendTarget] = useState(null)

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
