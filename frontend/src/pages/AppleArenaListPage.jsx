import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Plus, Gamepad2, Users, Clock, Play, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { getAppleArenaRooms, createAppleArenaRoom, deleteAppleArenaRoom } from '../api/appleArena'
import './AppleArenaListPage.css'

const STATUS_LABEL = { waiting: '대기 중', playing: '게임 중', finished: '종료' }
const STATUS_CLASS = { waiting: 'status-waiting', playing: 'status-playing', finished: 'status-finished' }

export default function AppleArenaListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('active') // active | finished

  const statusFilter = tab === 'active' ? undefined : 'finished'

  const { data: rooms = [], isLoading, refetch } = useQuery(
    ['apple-arena-rooms', tab],
    () => getAppleArenaRooms(statusFilter ? { status: statusFilter } : {}).then(r => r.data),
    { refetchInterval: tab === 'active' ? 5000 : false }
  )

  const createMutation = useMutation(createAppleArenaRoom, {
    onSuccess: (res) => {
      toast.success('방이 생성되었습니다.')
      navigate(`/apple-arena/${res.data.id}`)
    },
    onError: (err) => toast.error(err.response?.data?.detail || '방 생성에 실패했습니다.'),
  })

  const deleteMutation = useMutation(deleteAppleArenaRoom, {
    onSuccess: () => {
      toast.success('방이 삭제되었습니다.')
      queryClient.invalidateQueries('apple-arena-rooms')
    },
    onError: (err) => toast.error(err.response?.data?.detail || '삭제에 실패했습니다.'),
  })

  return (
    <div className="apple-list-page fade-in">
      <div className="apple-list-header">
        <div>
          <h1 className="apple-list-title">
            <Gamepad2 size={24} />
            사과 게임 아레나
          </h1>
          <p className="apple-list-desc">최대 4명이 함께 즐기는 사과 게임 대결</p>
        </div>
        {user && (
          <button
            className="btn btn-primary"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isLoading}
          >
            <Plus size={16} />
            {createMutation.isLoading ? '생성 중...' : '방 만들기'}
          </button>
        )}
      </div>

      <div className="apple-list-tabs">
        <button
          className={`apple-tab${tab === 'active' ? ' active' : ''}`}
          onClick={() => setTab('active')}
        >
          진행 중인 방
        </button>
        <button
          className={`apple-tab${tab === 'finished' ? ' active' : ''}`}
          onClick={() => setTab('finished')}
        >
          종료된 방
        </button>
      </div>

      {isLoading ? (
        <div className="apple-list-empty">불러오는 중...</div>
      ) : rooms.length === 0 ? (
        <div className="apple-list-empty">
          {tab === 'active' ? '진행 중인 방이 없습니다.' : '종료된 방이 없습니다.'}
          {tab === 'active' && user && (
            <button className="btn btn-primary mt-2" onClick={() => createMutation.mutate()}>
              <Plus size={14} /> 첫 번째 방 만들기
            </button>
          )}
        </div>
      ) : (
        <div className="apple-room-grid">
          {rooms.map((room) => (
            <div key={room.id} className="apple-room-card">
              <div className="room-card-top">
                <span className={`room-status ${STATUS_CLASS[room.status]}`}>
                  {STATUS_LABEL[room.status]}
                </span>
                {(user?.is_admin || user?.id === room.creator_id) && (
                  <button
                    className="room-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('방을 삭제하시겠습니까?')) deleteMutation.mutate(room.id)
                    }}
                    title="방 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="room-card-body" onClick={() => navigate(`/apple-arena/${room.id}`)}>
                <p className="room-creator">
                  <span className="room-host-badge">방장</span>
                  {room.creator_nickname}
                </p>
                <div className="room-card-meta">
                  <span><Users size={13} /> {room.player_count} / 4명</span>
                  <span>
                    <Clock size={13} />
                    {formatDistanceToNow(new Date(room.created_at), { addSuffix: true, locale: ko })}
                  </span>
                </div>
              </div>

              <button
                className={`room-enter-btn${room.status === 'finished' ? ' btn-secondary' : ' btn-primary'}`}
                onClick={() => navigate(`/apple-arena/${room.id}`)}
              >
                {room.status === 'waiting' && <><Play size={13} /> 입장</>}
                {room.status === 'playing' && <><Play size={13} /> 관전</>}
                {room.status === 'finished' && '결과 보기'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
