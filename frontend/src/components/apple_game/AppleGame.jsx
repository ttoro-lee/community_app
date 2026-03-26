import { useState, useEffect, useCallback, useRef } from 'react'
import './AppleGame.css'

const ROWS = 10
const COLS = 17
const TARGET = 10

const COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#10b981',
  6: '#06b6d4',
  7: '#3b82f6',
  8: '#8b5cf6',
  9: '#ec4899',
}

export default function AppleGame({
  initialBoard,
  onBoardChange,
  isActive = true,
  readOnly = false,
  externalBoard = null,   // 리플레이 모드에서 외부에서 보드 주입
  externalScore = null,
}) {
  const [board, setBoard] = useState(() =>
    initialBoard ? initialBoard.map(r => [...r]) : []
  )
  const [score, setScore] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [dragCurrent, setDragCurrent] = useState(null)
  const boardRef = useRef(null)

  // 외부 보드 주입 (리플레이 모드)
  useEffect(() => {
    if (externalBoard) {
      setBoard(externalBoard.map(r => [...r]))
    }
  }, [externalBoard])

  useEffect(() => {
    if (externalScore !== null) setScore(externalScore)
  }, [externalScore])

  useEffect(() => {
    if (initialBoard && !externalBoard) {
      setBoard(initialBoard.map(r => [...r]))
      setScore(0)
    }
  }, [initialBoard])

  // 선택 사각형 계산
  const getSelectionRect = useCallback(() => {
    if (!dragStart || !dragCurrent) return null
    return {
      r1: Math.min(dragStart.r, dragCurrent.r),
      r2: Math.max(dragStart.r, dragCurrent.r),
      c1: Math.min(dragStart.c, dragCurrent.c),
      c2: Math.max(dragStart.c, dragCurrent.c),
    }
  }, [dragStart, dragCurrent])

  const getSelectedCells = useCallback(() => {
    const rect = getSelectionRect()
    if (!rect) return { cells: [], sum: 0 }
    const cells = []
    let sum = 0
    for (let r = rect.r1; r <= rect.r2; r++) {
      for (let c = rect.c1; c <= rect.c2; c++) {
        const v = board[r]?.[c]
        if (v > 0) {
          cells.push({ r, c, v })
          sum += v
        }
      }
    }
    return { cells, sum }
  }, [getSelectionRect, board])

  const handleMouseUp = useCallback(() => {
    if (!isDragging || readOnly || !isActive) {
      setIsDragging(false)
      setDragStart(null)
      setDragCurrent(null)
      return
    }
    setIsDragging(false)

    const { cells, sum } = getSelectedCells()
    if (sum === TARGET && cells.length > 0) {
      const newBoard = board.map(row => [...row])
      const cleared = []
      for (const { r, c } of cells) {
        newBoard[r][c] = 0
        cleared.push({ r, c })
      }
      setBoard(newBoard)
      const newScore = score + cells.length
      setScore(newScore)
      onBoardChange?.(newScore, cleared, newBoard)
    }

    setDragStart(null)
    setDragCurrent(null)
  }, [isDragging, readOnly, isActive, getSelectedCells, board, score, onBoardChange])

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  const { cells: selectedCells, sum: selSum } = getSelectedCells()
  const selSet = new Set(selectedCells.map(({ r, c }) => `${r},${c}`))
  const rect = getSelectionRect()
  const isValid = selSum === TARGET && selectedCells.length > 0

  const displayScore = externalScore !== null ? externalScore : score
  const displayBoard = externalBoard || board

  return (
    <div className="apple-game" ref={boardRef}>
      {rect && (
        <div className={`sel-sum-badge ${isValid ? 'valid' : 'invalid'}`}>
          {selSum}
        </div>
      )}
      <div
        className={`apple-board${!isActive || readOnly ? ' inactive' : ''}`}
        onMouseLeave={() => {
          if (isDragging) {
            setIsDragging(false)
            setDragStart(null)
            setDragCurrent(null)
          }
        }}
      >
        {displayBoard.map((row, r) =>
          row.map((v, c) => {
            const key = `${r},${c}`
            const inSel = selSet.has(key)
            const inRect = rect && r >= rect.r1 && r <= rect.r2 && c >= rect.c1 && c <= rect.c2
            const isEmpty = v === 0

            return (
              <div
                key={key}
                className={[
                  'apple-cell',
                  isEmpty ? 'empty' : '',
                  inRect ? (isValid ? 'rect-valid' : 'rect-invalid') : '',
                  inSel ? 'selected' : '',
                ].join(' ')}
                style={!isEmpty ? { '--col': COLORS[v] } : {}}
                onMouseDown={(e) => {
                  if (readOnly || !isActive) return
                  e.preventDefault()
                  setIsDragging(true)
                  setDragStart({ r, c })
                  setDragCurrent({ r, c })
                }}
                onMouseEnter={() => {
                  if (isDragging) setDragCurrent({ r, c })
                }}
              >
                {!isEmpty && <span className="apple-num">{v}</span>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
