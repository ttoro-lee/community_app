import './AppleGameMini.css'

export default function AppleGameMini({ player, board, onClick, isMe = false }) {
  return (
    <div className={`mini-wrapper${isMe ? ' mini-me' : ''}`} onClick={onClick}>
      <div className="mini-header">
        <span className="mini-name">{player?.nickname}</span>
        <span className="mini-score">{player?.score ?? 0}점</span>
      </div>
      <div className="mini-board">
        {board
          ? board.map((row, r) =>
              row.map((v, c) => (
                <div
                  key={`${r},${c}`}
                  className="mini-cell"
                  style={{ background: v > 0 ? '#dc2626' : 'rgba(148,163,184,0.15)' }}
                />
              ))
            )
          : Array.from({ length: 170 }).map((_, i) => (
              <div key={i} className="mini-cell" style={{ background: 'rgba(148,163,184,0.15)' }} />
            ))}
      </div>
    </div>
  )
}
