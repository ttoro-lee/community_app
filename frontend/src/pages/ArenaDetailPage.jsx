import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  getArena, getArenaMessages, sendArenaMessage, castVote, acceptArena, declineArena,
} from '../api/arena'
import { useAuth } from '../contexts/AuthContext'
import {
  Swords, Crown, Skull, Clock, Send, Users, ChevronLeft,
  Check, X, ThumbsUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import './ArenaDetailPage.css'

// ── 타이머 훅 ────────────────────────────────────────────────────────────────

function useCountdown(endsAt) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (!endsAt) { setRemaining(null); return }

    const tick = () => {
      const diff = Math.max(0, new Date(endsAt) - Date.now())
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [endsAt])

  return remaining
}

function formatCountdown(ms) {
  if (ms === null) return '--:--'
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── 유저 패널 (참가자 카드) ───────────────────────────────────────────────────

function PlayerCard({ player, votes, totalVotes, isWinner, isLoser, isFinished, myVote, onVote, canVote, side }) {
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
  const barColor = side === 'creator' ? '#6366f1' : '#ec4899'

  return (
    <div className={`arena-player-card${isWinner ? ' winner' : ''}${isLoser ? ' loser' : ''}`}>
      {isWinner && (
        <div className="arena-result-crown">
          <Crown size={22} />
          <span>승리</span>
        </div>
      )}
      {isLoser && (
        <div className="arena-result-skull">
          <Skull size={18} />
          <span>패배</span>
        </div>
      )}

      <div className={`arena-player-avatar-lg arena-player-avatar--${side}`}>
        {player.nickname[0]}
      </div>
      <div className="arena-player-nickname">{player.nickname}</div>

      <div className="arena-vote-info">
        <span className="arena-vote-num">{votes}표</span>
        <span className="arena-vote-pct">({pct}%)</span>
      </div>

      <div className="arena-vote-bar-sm">
        <div
          className="arena-vote-bar-fill-sm"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>

      {canVote && (
        <button
          className={`arena-vote-btn${myVote === player.id ? ' voted' : ''}`}
          onClick={() => onVote(player.id)}
        >
          <ThumbsUp size={13} />
          {myVote === player.id ? '투표 완료' : '투표'}
        </button>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ArenaDetailPage() {
  const { arenaId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [spectatorCount, setSpectatorCount] = useState(0)
  const [voteCounts, setVoteCounts] = useState({ creator_votes: 0, opponent_votes: 0, my_vote: null })
  const [arenaState, setArenaState] = useState(null)  // local real-time state
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const wsRef = useRef(null)
  const inputRef = useRef(null)

  // 아레나 데이터 fetch
  const { data: arena, isLoading } = useQuery(
    ['arena', arenaId],
    () => getArena(arenaId),
    {
      onSuccess: (data) => {
        setArenaState(data)
        setVoteCounts({
          creator_votes: data.creator_votes,
          opponent_votes: data.opponent_votes,
          my_vote: data.my_vote,
        })
      },
      refetchInterval: (data) => {
        // active 상태면 30초마다 서버와 동기화 (WebSocket 보완)
        return data?.status === 'active' ? 30000 : false
      },
    }
  )

  // 메시지 fetch
  const { data: initMessages } = useQuery(
    ['arenaMessages', arenaId],
    () => getArenaMessages(arenaId),
    { onSuccess: (data) => setMessages(data) }
  )

  // 타이머
  const remaining = useCountdown(arenaState?.ends_at)

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket 연결
  useEffect(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/arenas/${arenaId}/ws`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      // keep-alive ping 30초마다
      const pingId = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 30000)
      ws._pingId = pingId
    }

    ws.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data)
        handleWsEvent(ev)
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      if (ws._pingId) clearInterval(ws._pingId)
    }

    return () => {
      if (ws._pingId) clearInterval(ws._pingId)
      ws.close()
    }
  }, [arenaId])

  const handleWsEvent = useCallback((ev) => {
    switch (ev.type) {
      case 'message':
        setMessages((prev) => {
          // 실제 ID 중복 방지
          if (prev.some((m) => m.id === ev.data.id)) return prev
          // 같은 유저의 임시 메시지(_temp)가 있으면 교체, 없으면 추가
          const tempIdx = prev.findIndex(
            (m) => m._temp && m.user_id === ev.data.user_id && m.content === ev.data.content
          )
          if (tempIdx !== -1) {
            const next = [...prev]
            next[tempIdx] = ev.data
            return next
          }
          return [...prev, ev.data]
        })
        break
      case 'vote_update':
        setVoteCounts(ev.data)
        break
      case 'arena_started':
        setArenaState(ev.data)
        queryClient.invalidateQueries(['arena', arenaId])
        toast.success('아레나가 시작되었습니다!')
        break
      case 'arena_ended':
        setArenaState(ev.data)
        setVoteCounts({
          creator_votes: ev.data.creator_votes,
          opponent_votes: ev.data.opponent_votes,
          my_vote: ev.data.my_vote,
        })
        queryClient.invalidateQueries(['arena', arenaId])
        toast('아레나가 종료되었습니다.', { icon: '🏆' })
        break
      case 'spectator_count':
        setSpectatorCount(ev.data.count)
        break
      default: break
    }
  }, [arenaId, queryClient])

  // 타이머 만료 시 상태 갱신
  useEffect(() => {
    if (remaining === 0 && arenaState?.status === 'active') {
      // 서버에서 finished로 처리되도록 재조회
      setTimeout(() => queryClient.invalidateQueries(['arena', arenaId]), 1000)
    }
  }, [remaining])

  // 메시지 전송 (낙관적 업데이트: 즉시 화면에 표시 후 서버 확인)
  const handleSend = async () => {
    if (!inputText.trim() || sending) return
    const content = inputText.trim()
    setInputText('')
    setSending(true)

    // 임시 ID로 즉시 화면에 추가 (WebSocket 응답 오기 전에 보이게)
    const tempId = `temp_${Date.now()}`
    const tempMsg = {
      id: tempId,
      arena_id: Number(arenaId),
      user_id: user.id,
      user: { id: user.id, nickname: user.nickname, avatar_url: user.avatar_url },
      content,
      created_at: new Date().toISOString(),
      _temp: true,
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const saved = await sendArenaMessage(arenaId, content)
      // 임시 메시지를 서버에서 받은 실제 메시지로 교체
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...saved, _temp: false } : m))
      )
    } catch (err) {
      // 전송 실패 시 임시 메시지 제거
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setInputText(content)  // 내용 복원
      toast.error(err.response?.data?.detail || '메시지 전송 실패')
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // 투표
  const voteMutation = useMutation(
    (votedForId) => castVote(arenaId, votedForId),
    {
      onSuccess: (data) => {
        setVoteCounts(data)
        toast.success('투표했습니다!')
      },
      onError: (err) => toast.error(err.response?.data?.detail || '투표 실패'),
    }
  )

  // 수락/거절
  const acceptMutation = useMutation(() => acceptArena(arenaId), {
    onSuccess: (data) => {
      setArenaState(data)
      queryClient.invalidateQueries(['arena', arenaId])
      toast.success('아레나를 수락했습니다!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || '수락 실패'),
  })

  const declineMutation = useMutation(() => declineArena(arenaId), {
    onSuccess: () => {
      toast('아레나를 거절했습니다.')
      navigate('/arena')
    },
    onError: (err) => toast.error(err.response?.data?.detail || '거절 실패'),
  })

  if (isLoading) return <div className="arena-detail-loading">로딩 중...</div>
  if (!arena) return null

  const current = arenaState || arena
  const isCreator = user?.id === current.creator.id
  const isOpponent = user?.id === current.opponent.id
  const isParticipant = isCreator || isOpponent
  const isFinished = current.status === 'finished'
  const isActive = current.status === 'active'
  const isPending = current.status === 'pending'
  const canChat = isParticipant && isActive
  const canVote = user && !isParticipant && (isActive || isFinished)

  // 승패 판정
  const { creator_votes, opponent_votes, my_vote } = voteCounts
  const creatorWins = isFinished && creator_votes > opponent_votes
  const opponentWins = isFinished && opponent_votes > creator_votes
  const totalVotes = creator_votes + opponent_votes

  // 타이머 경고색
  const timerWarn = isActive && remaining !== null && remaining < 60000
  const timerDanger = isActive && remaining !== null && remaining < 10000

  return (
    <div className="arena-detail-page fade-in">
      {/* 뒤로 가기 */}
      <button className="arena-back-btn" onClick={() => navigate('/arena')}>
        <ChevronLeft size={15} /> 아레나 목록
      </button>

      {/* 상단 헤더 */}
      <div className="arena-detail-header">
        <div className="arena-detail-title">
          <Swords size={20} className="arena-title-icon" />
          <span>아레나 #{current.id}</span>
        </div>

        {/* 타이머 */}
        {isActive && (
          <div className={`arena-timer${timerWarn ? ' warn' : ''}${timerDanger ? ' danger' : ''}`}>
            <Clock size={15} />
            <span>{formatCountdown(remaining)}</span>
          </div>
        )}

        {isFinished && (
          <span className="arena-badge arena-badge--finished">종료됨</span>
        )}

        {isPending && (
          <span className="arena-badge arena-badge--pending">수락 대기 중</span>
        )}

        <div className="arena-spectator-count">
          <Users size={14} />
          <span>{spectatorCount}명 관람 중</span>
        </div>
      </div>

      {/* 수락/거절 배너 */}
      {isPending && isOpponent && (
        <div className="arena-invite-banner">
          <div className="arena-invite-text">
            <Swords size={16} className="arena-title-icon" />
            <strong>{current.creator.nickname}</strong>님이 아레나에 도전장을 보냈습니다!
            ({current.duration_minutes}분)
          </div>
          <div className="arena-invite-actions">
            <button
              className="arena-accept-btn"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isLoading}
            >
              <Check size={15} /> 수락
            </button>
            <button
              className="arena-decline-btn"
              onClick={() => declineMutation.mutate()}
              disabled={declineMutation.isLoading}
            >
              <X size={15} /> 거절
            </button>
          </div>
        </div>
      )}

      {isPending && isCreator && (
        <div className="arena-waiting-banner">
          <Clock size={15} />
          {current.opponent.nickname}님의 수락을 기다리는 중...
        </div>
      )}

      {/* 메인 레이아웃: 참가자 카드 + 채팅 */}
      <div className="arena-detail-body">
        {/* 왼쪽: 참가자 카드 */}
        <div className="arena-players-col">
          <PlayerCard
            player={current.creator}
            votes={creator_votes}
            totalVotes={totalVotes}
            isWinner={creatorWins}
            isLoser={isFinished && opponentWins}
            isFinished={isFinished}
            myVote={my_vote}
            onVote={(id) => voteMutation.mutate(id)}
            canVote={canVote}
            side="creator"
          />

          <div className="arena-vs-divider">
            <span>VS</span>
          </div>

          <PlayerCard
            player={current.opponent}
            votes={opponent_votes}
            totalVotes={totalVotes}
            isWinner={opponentWins}
            isLoser={isFinished && creatorWins}
            isFinished={isFinished}
            myVote={my_vote}
            onVote={(id) => voteMutation.mutate(id)}
            canVote={canVote}
            side="opponent"
          />

          {/* 비겼을 때 */}
          {isFinished && creator_votes === opponent_votes && totalVotes > 0 && (
            <div className="arena-draw-badge">🤝 무승부</div>
          )}

          {!user && isActive && (
            <p className="arena-login-hint">
              <Link to="/login">로그인</Link>하면 투표할 수 있어요
            </p>
          )}
        </div>

        {/* 오른쪽: 채팅 */}
        <div className="arena-chat-col">
          <div className="arena-chat-label">
            대화 내용
            <span className="arena-chat-count">{messages.length}개</span>
          </div>

          <div className="arena-messages">
            {messages.length === 0 && (
              <div className="arena-messages-empty">
                {isPending ? '아레나 수락 후 대화가 시작됩니다' : '아직 메시지가 없습니다'}
              </div>
            )}
            {messages.map((msg) => {
              const isMsgCreator = msg.user_id === current.creator.id
              return (
                <div
                  key={msg.id}
                  className={`arena-msg${isMsgCreator ? ' arena-msg--creator' : ' arena-msg--opponent'}${msg._temp ? ' arena-msg--sending' : ''}`}
                >
                  <div className={`arena-msg-avatar arena-msg-avatar--${isMsgCreator ? 'creator' : 'opponent'}`}>
                    {msg.user.nickname[0]}
                  </div>
                  <div className="arena-msg-body">
                    <div className="arena-msg-name">{msg.user.nickname}</div>
                    <div className="arena-msg-bubble">{msg.content}</div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력창 */}
          {canChat && (
            <div className="arena-chat-input-row">
              <input
                ref={inputRef}
                className="arena-chat-input"
                type="text"
                placeholder="메시지를 입력하세요..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                maxLength={500}
                disabled={sending}
              />
              <button
                className="arena-send-btn"
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
              >
                <Send size={16} />
              </button>
            </div>
          )}

          {isFinished && isParticipant && (
            <div className="arena-chat-ended">아레나가 종료되었습니다</div>
          )}
          {!isParticipant && isActive && (
            <div className="arena-spectator-notice">관람 모드 — 채팅에 참여할 수 없습니다</div>
          )}
        </div>
      </div>
    </div>
  )
}
