import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'react-query'
import { ArrowLeft, Crown, Trophy, Medal, Timer, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { getAppleArenaRoom } from '../api/appleArena'
import AppleGame from '../components/apple_game/AppleGame'
import AppleGameMini from '../components/apple_game/AppleGameMini'
import './AppleArenaRoomPage.css'

const GAME_DURATION = 120

function getWsUrl(roomId, token) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const host = window.location.host
  return `${proto}://${host}/api/apple-arena/rooms/${roomId}/ws?token=${token}`
}

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function AppleArenaRoomPage() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  // ── 상태 ────────────────────────────────────────────────────────────────────
  const [gamePhase, setGamePhase] = useState('loading') // loading | lobby | playing | finished
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])

  // 게임 상태
  const [boards, setBoards] = useState({})       // user_id → board[][]
  const [scores, setScores] = useState({})       // user_id → score
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [gameStartedAt, setGameStartedAt] = useState(null)

  // 결과
  const [results, setResults] = useState([])
  const [selectedReplayId, setSelectedReplayId] = useState(null)
  const [replaySecond, setReplaySecond] = useState(0)
  const [replayData, setReplayData] = useState({}) // user_id → { initialBoard, snapshots }

  const wsRef = useRef(null)
  const timerRef = useRef(null)
  const snapshotsRef = useRef([])  // [{second, cleared, score}]
  const snapshotTimerRef = useRef(null)
  // 각 WS 인스턴스의 "의도적 close" setter (클로저 지역 변수 기반)
  // → StrictMode 이중 마운트 시 공유 ref 경쟁 조건 완전 차단
  const setWsClosingRef = useRef(() => {})  // noop으로 초기화, 각 WS 생성 시 교체
  const gamePhaseRef = useRef('loading')  // onclose에서 최신 phase 참조용
  const handleWsMsgRef = useRef(null)     // 항상 최신 핸들러 참조

  // 초기 방 정보 로드 (종료된 방 복원용)
  const { data: roomData } = useQuery(
    ['apple-arena-room', roomId],
    () => getAppleArenaRoom(roomId).then(r => r.data),
    { enabled: !!roomId, retry: false }
  )

  // 종료된 방에 접속 시 REST 데이터로 즉시 결과/리플레이 초기화
  useEffect(() => {
    if (!roomData || roomData.status !== 'finished') return
    setRoom(roomData)
    setPlayers(roomData.players || [])
    setResults(roomData.results || [])
    const rd = {}
    ;(roomData.players || []).forEach(p => {
      if (p.initial_board) {
        rd[p.user_id] = {
          initialBoard: p.initial_board,
          snapshots: p.snapshots || [],
          nickname: p.nickname,
          finalScore: p.score,
        }
      }
    })
    setReplayData(rd)
    setGamePhase('finished')
  }, [roomData])

  // gamePhaseRef를 state와 동기화 (onclose 핸들러의 stale closure 방지)
  useEffect(() => { gamePhaseRef.current = gamePhase }, [gamePhase])

  // ── WebSocket 연결 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    const token = localStorage.getItem('access_token')
    if (!token) {
      toast.error('로그인이 필요합니다.')
      navigate('/login')
      return
    }

    // ★ 클로저 지역 변수: 이 WS 인스턴스 전용 (공유 ref 경쟁 조건 완전 차단)
    //   StrictMode에서 cleanup 후 재마운트 시, 이전 인스턴스의 closing=true가
    //   새 인스턴스의 false 로 덮어써지는 문제가 없음
    let closing = false
    setWsClosingRef.current = () => { closing = true }

    const ws = new WebSocket(getWsUrl(roomId, token))
    wsRef.current = ws

    ws.onopen = () => {}

    // handleWsMsgRef를 통해 항상 최신 핸들러를 호출 (stale closure 방지)
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        handleWsMsgRef.current?.(msg)
      } catch (_) {}
    }

    ws.onerror = () => {
      if (!closing) toast.error('서버 연결에 실패했습니다.')
    }

    ws.onclose = (e) => {
      if (closing) return  // 의도적 close(cleanup/error 메시지 수신) → 무시
      // 게임이 이미 끝난 상태면 연결 끊김 토스트 불필요
      if (gamePhaseRef.current === 'finished') return
      if (e.code === 4001) { toast.error('인증에 실패했습니다.'); navigate('/login') }
      else if (e.code === 4003) { toast.error('입장할 수 없는 방입니다.'); navigate('/apple-arena') }
      else if (e.code === 4004) { toast.error('방을 찾을 수 없습니다.'); navigate('/apple-arena') }
      else if (e.code !== 1000) { toast.error('연결이 끊어졌습니다. 새로고침 해주세요.') }
    }

    // 핑
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
    }, 25000)

    return () => {
      closing = true  // 이 WS 인스턴스만 조용히 닫힘
      setWsClosingRef.current = () => {}  // 더 이상 유효하지 않음
      clearInterval(pingInterval)
      ws.close()
      clearInterval(timerRef.current)
      clearInterval(snapshotTimerRef.current)
    }
  }, [roomId])

  // handleWsMsgRef를 항상 최신 콜백으로 갱신 (stale closure 방지)
  const handleWsMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'room_state': {
        const d = msg.data
        setRoom(d)
        setPlayers(d.players || [])
        const phase = d.status === 'waiting' ? 'lobby'
          : d.status === 'playing' ? 'playing'
          : 'finished'
        setGamePhase(phase)

        if (d.status === 'playing' && d.boards) {
          setBoards(d.boards)
          const initScores = {}
          ;(d.players || []).forEach(p => { initScores[p.user_id] = p.score })
          setScores(initScores)
          startClientTimer()
        }
        if (d.status === 'finished' && d.results) {
          setResults(d.results)
          // 리플레이 데이터 세팅
          const rd = {}
          ;(d.players || []).forEach(p => {
            if (p.initial_board) {
              rd[p.user_id] = {
                initialBoard: p.initial_board,
                snapshots: p.snapshots || [],
                nickname: p.nickname,
                finalScore: p.score,
              }
            }
          })
          setReplayData(rd)
        }
        break
      }

      case 'player_joined':
        setPlayers(prev => {
          if (prev.find(p => p.user_id === msg.data.user_id)) return prev
          return [...prev, msg.data]
        })
        toast(`${msg.data.nickname}님이 입장했습니다.`)
        break

      case 'player_left':
        toast(`플레이어가 퇴장했습니다.`)
        break

      case 'player_ready':
        setPlayers(prev => prev.map(p =>
          p.user_id === msg.data.user_id ? { ...p, is_ready: msg.data.is_ready } : p
        ))
        break

      case 'game_started': {
        const { boards: b, duration } = msg.data
        setBoards(b)
        setTimeLeft(duration ?? GAME_DURATION)
        setGameStartedAt(Date.now())
        setGamePhase('playing')
        snapshotsRef.current = []
        startClientTimer()
        startSnapshotTimer()
        toast.success('게임 시작!')
        break
      }

      case 'board_change': {
        const { user_id, score, cleared } = msg.data
        setScores(prev => ({ ...prev, [user_id]: score }))
        if (user_id !== user?.id) {
          // 상대방 보드 업데이트
          setBoards(prev => {
            const board = prev[user_id]
            if (!board) return prev
            const nb = board.map(r => [...r])
            cleared.forEach(({ r, c }) => { nb[r][c] = 0 })
            return { ...prev, [user_id]: nb }
          })
        }
        break
      }

      case 'game_ended': {
        clearInterval(timerRef.current)
        clearInterval(snapshotTimerRef.current)
        setGamePhase('finished')
        setResults(msg.data.results || [])
        // 스냅샷 제출
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'submit_snapshots',
            data: { snapshots: snapshotsRef.current },
          }))
        }
        // 결과 화면 데이터 새로고침
        setTimeout(() => {
          getAppleArenaRoom(roomId).then(r => {
            const rd = {}
            ;(r.data.players || []).forEach(p => {
              if (p.initial_board) {
                rd[p.user_id] = {
                  initialBoard: p.initial_board,
                  snapshots: p.snapshots || [],
                  nickname: p.nickname,
                  finalScore: p.score,
                }
              }
            })
            setReplayData(rd)
          }).catch(() => {})
        }, 1500)
        break
      }

      // 서버가 close 전에 전송하는 에러 메시지
      // (Vite 프록시가 custom close code를 항상 중계 못하는 문제 대응)
      case 'error': {
        const { code, message } = msg.data
        setWsClosingRef.current()  // 이후 onclose/onerror 무시 (per-WS 지역 변수 설정)
        if (code === 4001) { toast.error(message || '인증에 실패했습니다.'); navigate('/login') }
        else if (code === 4003) { toast.error(message || '입장할 수 없는 방입니다.'); navigate('/apple-arena') }
        else if (code === 4004) { toast.error(message || '방을 찾을 수 없습니다.'); navigate('/apple-arena') }
        else { toast.error(message || '오류가 발생했습니다.') }
        break
      }

      default:
        break
    }
  }, [user?.id, roomId, navigate])

  // 렌더마다 ref를 최신 콜백으로 동기화
  handleWsMsgRef.current = handleWsMessage

  const startClientTimer = useCallback(() => {
    clearInterval(timerRef.current)
    let left = GAME_DURATION
    setTimeLeft(left)
    timerRef.current = setInterval(() => {
      left -= 1
      setTimeLeft(left)
      if (left <= 0) clearInterval(timerRef.current)
    }, 1000)
  }, [])

  const startSnapshotTimer = useCallback(() => {
    clearInterval(snapshotTimerRef.current)
    let second = 0
    snapshotTimerRef.current = setInterval(() => {
      second += 1
      // 스냅샷은 board_change 이벤트에서 already captured
      // 여기서는 second만 증가 (cleared 목록은 handleBoardChange에서 기록)
    }, 1000)
  }, [])

  const handleBoardChange = useCallback((newScore, cleared, _newBoard) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    const second = gameStartedAt ? Math.floor((Date.now() - gameStartedAt) / 1000) : 0
    wsRef.current.send(JSON.stringify({
      type: 'board_change',
      data: { score: newScore, cleared },
    }))
    snapshotsRef.current.push({ second, cleared, score: newScore })
    setScores(prev => ({ ...prev, [user?.id]: newScore }))
  }, [user?.id, gameStartedAt])

  const handleReady = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ready' }))
    }
  }

  const handleStartGame = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_game' }))
    }
  }

  // ── 리플레이 보드 계산 ─────────────────────────────────────────────────────
  const getReplayBoard = useCallback((userId, second) => {
    const rd = replayData[userId]
    if (!rd?.initialBoard) return null
    const board = rd.initialBoard.map(r => [...r])
    for (const snap of rd.snapshots) {
      if (snap.second <= second) {
        snap.cleared.forEach(({ r, c }) => { board[r][c] = 0 })
      }
    }
    return board
  }, [replayData])

  const getReplayScore = useCallback((userId, second) => {
    const rd = replayData[userId]
    if (!rd) return 0
    let score = 0
    for (const snap of rd.snapshots) {
      if (snap.second <= second) score = snap.score
    }
    return score
  }, [replayData])

  // ── 랭킹 정렬 ─────────────────────────────────────────────────────────────
  const ranking = [...players].sort((a, b) =>
    (scores[b.user_id] ?? b.score ?? 0) - (scores[a.user_id] ?? a.score ?? 0)
  )

  const myPlayer = players.find(p => p.user_id === user?.id)
  const otherPlayers = players.filter(p => p.user_id !== user?.id)
  const isCreator = room?.creator_id === user?.id
  const allNonCreatorReady = players.filter(p => p.user_id !== room?.creator_id).every(p => p.is_ready)
  const canStart = isCreator && players.length >= 1 && (players.length === 1 || allNonCreatorReady)

  // ── 렌더링 ─────────────────────────────────────────────────────────────────

  if (gamePhase === 'loading') {
    return <div className="arena-loading">불러오는 중...</div>
  }

  return (
    <div className="apple-room-page fade-in">
      <button className="back-btn" onClick={() => navigate('/apple-arena')}>
        <ArrowLeft size={15} /> 목록으로
      </button>

      {/* ── 대기실 ────────────────────────────────────────────────────────── */}
      {gamePhase === 'lobby' && (
        <div className="lobby-wrap">
          <h2 className="lobby-title">🍎 사과 게임 아레나</h2>
          <p className="lobby-sub">방 #{roomId} · 최대 4명</p>

          <div className="lobby-players">
            {players.map((p) => (
              <div key={p.user_id} className={`lobby-player${p.user_id === user?.id ? ' me' : ''}`}>
                <div className="lobby-avatar">{p.nickname.charAt(0).toUpperCase()}</div>
                <span className="lobby-nickname">{p.nickname}</span>
                {room?.creator_id === p.user_id && <Crown size={14} className="crown-icon" />}
                <span className={`lobby-ready${p.user_id === room?.creator_id ? ' host' : p.is_ready ? ' yes' : ' no'}`}>
                  {p.user_id === room?.creator_id ? '방장' : p.is_ready ? '준비완료' : '대기 중'}
                </span>
              </div>
            ))}
            {Array.from({ length: 4 - players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="lobby-player empty">
                <div className="lobby-avatar empty-avatar" />
                <span className="lobby-nickname empty-text">빈 자리</span>
              </div>
            ))}
          </div>

          <div className="lobby-actions">
            {myPlayer && room?.creator_id !== user?.id && (
              <button
                className={`btn ${myPlayer.is_ready ? 'btn-secondary' : 'btn-success'}`}
                onClick={handleReady}
              >
                <CheckCircle2 size={15} />
                {myPlayer.is_ready ? '준비 취소' : '준비 완료'}
              </button>
            )}
            {isCreator && (
              <button
                className="btn btn-primary"
                onClick={handleStartGame}
                disabled={!canStart}
                title={!canStart ? '모든 플레이어가 준비 완료해야 시작할 수 있습니다.' : ''}
              >
                게임 시작
              </button>
            )}
          </div>
          <p className="lobby-hint">방 링크를 공유해 친구를 초대하세요! (최대 4명)</p>
        </div>
      )}

      {/* ── 게임 화면 ──────────────────────────────────────────────────────── */}
      {gamePhase === 'playing' && (
        <div className="game-layout">
          {/* 좌측: 상대방 미니 보드 */}
          <div className="game-left">
            <p className="panel-label">다른 플레이어</p>
            {otherPlayers.map(p => (
              <AppleGameMini
                key={p.user_id}
                player={{ ...p, score: scores[p.user_id] ?? p.score ?? 0 }}
                board={boards[p.user_id] || null}
              />
            ))}
            {otherPlayers.length === 0 && (
              <p className="no-others">혼자 연습 중</p>
            )}
          </div>

          {/* 중앙: 내 게임 */}
          <div className="game-center">
            <div className="game-top-bar">
              <div className="my-score-display">
                내 점수: <strong>{scores[user?.id] ?? 0}</strong>
              </div>
              <div className={`timer-display${timeLeft <= 30 ? ' danger' : timeLeft <= 60 ? ' warn' : ''}`}>
                <Timer size={16} />
                {formatTime(timeLeft)}
              </div>
            </div>
            <AppleGame
              key={`game-${user?.id}`}
              initialBoard={boards[user?.id] || null}
              onBoardChange={handleBoardChange}
              isActive={timeLeft > 0}
            />
          </div>

          {/* 우측: 실시간 랭킹 */}
          <div className="game-right">
            <p className="panel-label">실시간 순위</p>
            {ranking.map((p, i) => (
              <div key={p.user_id} className={`rank-item${p.user_id === user?.id ? ' rank-me' : ''}`}>
                <span className="rank-num">{i + 1}</span>
                <span className="rank-name">{p.nickname}</span>
                <span className="rank-score">{scores[p.user_id] ?? p.score ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 결과 화면 ──────────────────────────────────────────────────────── */}
      {gamePhase === 'finished' && (
        <div className="result-wrap">
          <h2 className="result-title">🏆 게임 결과</h2>

          {/* 랭킹 */}
          <div className="result-ranking">
            {results.map((r) => (
              <div key={r.user_id} className={`result-row${r.user_id === user?.id ? ' result-me' : ''}`}>
                <span className="result-rank">
                  {r.rank === 1 ? <Trophy size={18} className="gold" />
                    : r.rank === 2 ? <Medal size={18} className="silver" />
                    : r.rank === 3 ? <Medal size={18} className="bronze" />
                    : <span className="rank-num-plain">{r.rank}</span>}
                </span>
                <span className="result-nickname">{r.nickname}</span>
                <span className="result-score">{r.score}점</span>
              </div>
            ))}
          </div>

          {/* 리플레이 선택 */}
          <div className="replay-section">
            <h3 className="replay-section-title">게임 리플레이</h3>
            <div className="replay-player-list">
              {results.map((r) => (
                <button
                  key={r.user_id}
                  className={`replay-pick-btn${selectedReplayId === r.user_id ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedReplayId(r.user_id)
                    setReplaySecond(0)
                  }}
                  disabled={!replayData[r.user_id]}
                  title={!replayData[r.user_id] ? '리플레이 데이터 없음' : ''}
                >
                  {r.nickname}
                  {!replayData[r.user_id] && ' (없음)'}
                </button>
              ))}
            </div>

            {selectedReplayId && replayData[selectedReplayId] && (
              <div className="replay-viewer">
                <div className="replay-info">
                  <span>{replayData[selectedReplayId].nickname}의 리플레이</span>
                  <span className="replay-time">{formatTime(replaySecond)}</span>
                  <span className="replay-score-val">
                    {getReplayScore(selectedReplayId, replaySecond)}점
                  </span>
                </div>
                <AppleGame
                  externalBoard={getReplayBoard(selectedReplayId, replaySecond)}
                  externalScore={getReplayScore(selectedReplayId, replaySecond)}
                  isActive={false}
                  readOnly
                />
                <div className="replay-scrubber">
                  <input
                    type="range"
                    min={0}
                    max={GAME_DURATION}
                    value={replaySecond}
                    onChange={(e) => setReplaySecond(Number(e.target.value))}
                    className="scrubber-input"
                  />
                  <div className="scrubber-labels">
                    <span>0:00</span>
                    <span>{formatTime(GAME_DURATION)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button className="btn btn-secondary go-back" onClick={() => navigate('/apple-arena')}>
            목록으로
          </button>
        </div>
      )}
    </div>
  )
}
