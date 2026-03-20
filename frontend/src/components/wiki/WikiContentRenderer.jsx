import './WikiContentRenderer.css'

/**
 * 위키 단락 본문을 렌더링한다.
 *
 * 지원 마크업 (한 줄 단위):
 *   [image:URL]         → <img> 태그
 *   YouTube / Chzzk URL → <iframe> 임베드 (16:9 반응형)
 *
 * 인라인 마크업:
 *   [텍스트](url)       → 하이퍼링크 <a>
 *   **텍스트**          → 굵게 <strong>
 *   *텍스트*            → 기울임 <em>
 */

// ── 영상 URL → embed src 변환 ─────────────────────────────────────────────────

function extractEmbedUrl(text) {
  const t = text.trim()

  const ytPatterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of ytPatterns) {
    const m = t.match(p)
    if (m) return { src: `https://www.youtube.com/embed/${m[1]}`, label: 'YouTube' }
  }

  const chzzkClip = t.match(/chzzk\.naver\.com\/clips\/([a-zA-Z0-9_-]+)/)
  if (chzzkClip) return { src: `https://chzzk.naver.com/embed/clip/${chzzkClip[1]}`, label: 'Chzzk 클립' }

  const chzzkLive = t.match(/chzzk\.naver\.com\/live\/([a-zA-Z0-9_-]+)/)
  if (chzzkLive) return { src: `https://chzzk.naver.com/embed/live/${chzzkLive[1]}`, label: 'Chzzk 라이브' }

  const chzzkVod = t.match(/chzzk\.naver\.com\/video\/([a-zA-Z0-9_-]+)/)
  if (chzzkVod) return { src: `https://chzzk.naver.com/embed/video/${chzzkVod[1]}`, label: 'Chzzk VOD' }

  return null
}

// ── 인라인 파싱 ───────────────────────────────────────────────────────────────

function parseInline(text) {
  const segments = []
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: text.slice(last, match.index) })
    }
    if (match[1] && match[2]) {
      segments.push({ type: 'link', label: match[1], href: match[2] })
    } else if (match[3]) {
      segments.push({ type: 'bold', value: match[3] })
    } else if (match[4]) {
      segments.push({ type: 'italic', value: match[4] })
    }
    last = match.index + match[0].length
  }
  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) })
  }
  return segments
}

function renderInline(text, keyPrefix = '') {
  return parseInline(text).map((seg, i) => {
    const key = `${keyPrefix}-${i}`
    if (seg.type === 'link') {
      return (
        <a key={key} href={seg.href} target="_blank" rel="noopener noreferrer" className="wiki-link">
          {seg.label}
        </a>
      )
    }
    if (seg.type === 'bold') return <strong key={key}>{seg.value}</strong>
    if (seg.type === 'italic') return <em key={key}>{seg.value}</em>
    return <span key={key}>{seg.value}</span>
  })
}

// ── 직접 영상 파일 URL 여부 판별 ──────────────────────────────────────────────

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i

// ── 단락 본문 렌더링 ──────────────────────────────────────────────────────────

function renderContent(content) {
  if (!content) return null
  const lines = content.split('\n')

  return lines.map((line, i) => {
    const trimmed = line.trim()

    // ─ [image:URL] 마커
    if (trimmed.startsWith('[image:') && trimmed.endsWith(']')) {
      const url = trimmed.slice(7, -1).trim()
      return (
        <div key={i} className="wiki-media-wrap">
          <img
            src={url}
            alt="첨부 이미지"
            className="wiki-content-image"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      )
    }

    // ─ [video:URL] 마커 — YouTube/Chzzk는 iframe, 직접 파일은 <video>
    if (trimmed.startsWith('[video:') && trimmed.endsWith(']')) {
      const url = trimmed.slice(7, -1).trim()
      const embed = extractEmbedUrl(url)

      if (embed) {
        return (
          <div key={i} className="wiki-video-wrap">
            <div className="wiki-video-inner">
              <iframe
                src={embed.src}
                title={embed.label}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )
      }

      // 직접 영상 파일 URL
      return (
        <div key={i} className="wiki-video-wrap">
          <video
            src={url}
            className="wiki-direct-video"
            controls
            preload="metadata"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          >
            이 브라우저는 video 태그를 지원하지 않습니다.
          </video>
        </div>
      )
    }

    // ─ 하위 호환: 마커 없이 YouTube/Chzzk URL만 입력된 경우
    const embed = extractEmbedUrl(trimmed)
    if (embed) {
      return (
        <div key={i} className="wiki-video-wrap">
          <div className="wiki-video-inner">
            <iframe
              src={embed.src}
              title={embed.label}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )
    }

    // ─ 빈 줄
    if (trimmed === '') {
      return <br key={i} />
    }

    // ─ 일반 텍스트 (인라인 마크업 포함)
    return (
      <p key={i} className="wiki-paragraph">
        {renderInline(line, `line-${i}`)}
      </p>
    )
  })
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function WikiContentRenderer({ sections = [] }) {
  if (!sections.length) {
    return <div className="wiki-content-empty">내용이 없습니다.</div>
  }

  return (
    <div className="wiki-content-renderer">
      {sections.map((section, idx) => (
        <div key={idx} className="wiki-section">
          {section.heading && (
            <h2 className="wiki-section-heading" id={`section-${idx}`}>
              {section.heading}
            </h2>
          )}
          <div className="wiki-section-body">
            {renderContent(section.content)}
          </div>
        </div>
      ))}
    </div>
  )
}
