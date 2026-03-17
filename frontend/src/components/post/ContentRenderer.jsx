import './ContentRenderer.css'

/**
 * URL을 받아 임베드 가능한 경우 iframe src를 반환한다.
 * 지원 플랫폼:
 *   YouTube  - youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
 *   Chzzk    - chzzk.naver.com/clips/ID, chzzk.naver.com/live/ID, chzzk.naver.com/video/ID
 */
function extractEmbedUrl(text) {
  const t = text.trim()

  // ── YouTube ────────────────────────────────────────────────────────────────
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

  // ── Chzzk 클립 ────────────────────────────────────────────────────────────
  const chzzkClip = t.match(/chzzk\.naver\.com\/clips\/([a-zA-Z0-9_-]+)/)
  if (chzzkClip) {
    return { src: `https://chzzk.naver.com/embed/clip/${chzzkClip[1]}`, label: 'Chzzk 클립' }
  }

  // ── Chzzk 라이브 ──────────────────────────────────────────────────────────
  const chzzkLive = t.match(/chzzk\.naver\.com\/live\/([a-zA-Z0-9_-]+)/)
  if (chzzkLive) {
    return { src: `https://chzzk.naver.com/embed/live/${chzzkLive[1]}`, label: 'Chzzk 라이브' }
  }

  // ── Chzzk VOD ─────────────────────────────────────────────────────────────
  const chzzkVod = t.match(/chzzk\.naver\.com\/video\/([a-zA-Z0-9_-]+)/)
  if (chzzkVod) {
    return { src: `https://chzzk.naver.com/embed/video/${chzzkVod[1]}`, label: 'Chzzk VOD' }
  }

  return null
}

/**
 * 게시글 본문을 파싱하여 텍스트 / 이미지 / 영상으로 렌더링한다.
 *
 * 콘텐츠 마커 규칙:
 *   [image:URL]           → <img> 태그
 *   YouTube / Chzzk URL  → <iframe> 임베드 (16:9 반응형)
 *   그 외                 → 일반 텍스트 단락
 */
export default function ContentRenderer({ content }) {
  if (!content) return null

  const lines = content.split('\n')

  const rendered = lines.map((line, i) => {
    const trimmed = line.trim()

    // ── 이미지 마커 ─────────────────────────────────────────────────────────
    if (trimmed.startsWith('[image:') && trimmed.endsWith(']')) {
      const url = trimmed.slice(7, -1)
      return (
        <div key={i} className="content-image-wrap">
          <img
            src={url}
            alt="첨부 이미지"
            className="content-image"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
      )
    }

    // ── 영상 URL (YouTube / Chzzk) ──────────────────────────────────────────
    const embed = extractEmbedUrl(trimmed)
    if (embed) {
      return (
        <div key={i} className="content-video-wrap">
          <div className="content-video-inner">
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

    // ── 일반 텍스트 ─────────────────────────────────────────────────────────
    return <p key={i}>{line || <br />}</p>
  })

  return <div className="content-renderer">{rendered}</div>
}
