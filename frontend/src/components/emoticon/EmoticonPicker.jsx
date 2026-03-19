import { useEffect, useRef } from 'react'
import { useQuery } from 'react-query'
import { getEmoticons } from '../../api/emoticons'
import './EmoticonPicker.css'

/**
 * 이모티콘 선택 팝오버
 * @param {function} onSelect - 선택된 이모티콘 마커 문자열 콜백
 * @param {function} onClose  - 닫기 콜백
 */
export default function EmoticonPicker({ onSelect, onClose }) {
  const popoverRef = useRef(null)

  const { data: emoticons = [], isLoading } = useQuery('emoticons', getEmoticons, {
    staleTime: 60_000,
  })

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSelect = (emoticon) => {
    onSelect(`[emoticon:${emoticon.image_url}]`)
    onClose()
  }

  return (
    <div className="emoticon-picker" ref={popoverRef}>
      <div className="emoticon-picker-header">
        <span>이모티콘</span>
        <button className="emoticon-picker-close" onClick={onClose}>✕</button>
      </div>

      {isLoading ? (
        <div className="emoticon-picker-empty">불러오는 중...</div>
      ) : emoticons.length === 0 ? (
        <div className="emoticon-picker-empty">등록된 이모티콘이 없습니다.</div>
      ) : (
        <div className="emoticon-grid">
          {emoticons.map((em) => (
            <button
              key={em.id}
              className="emoticon-item"
              title={em.name}
              onClick={() => handleSelect(em)}
            >
              <img src={em.image_url} alt={em.name} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
