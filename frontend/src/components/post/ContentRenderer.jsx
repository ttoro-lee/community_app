import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import './ContentRenderer.css'

// ── marked 전역 설정 ───────────────────────────────────────────────────────
marked.use({ gfm: true, breaks: true })

// ── 유틸 ──────────────────────────────────────────────────────────────────

/**
 * URL을 받아 임베드 가능한 경우 iframe src를 반환한다.
 * 지원 플랫폼:
 *   YouTube  - youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
 *   Chzzk    - chzzk.naver.com/clips/ID, chzzk.naver.com/live/ID, chzzk.naver.com/video/ID
 */
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

/** HTML 특수문자 이스케이프 (속성값 삽입용) */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── 커스텀 마커 전처리 ─────────────────────────────────────────────────────

/**
 * [image:URL], [table:BASE64], [emoticon:URL] 마커와 영상 URL을
 * HTML 문자열로 변환한다. 이후 marked.parse()로 넘겨진다.
 */
function preprocessCustomMarkers(content) {
  const lines = content.split('\n')
  const out = []

  for (const line of lines) {
    const trimmed = line.trim()

    // ── [table:BASE64] ────────────────────────────────────────────────────
    if (trimmed.startsWith('[table:') && trimmed.endsWith(']')) {
      try {
        const tableObj = JSON.parse(decodeURIComponent(atob(trimmed.slice(7, -1))))
        const thead = `<tr>${tableObj.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`
        const tbody = tableObj.rows
          .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
          .join('')
        out.push(
          `<div class="content-table-wrap"><table class="content-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`
        )
      } catch {
        out.push(line)
      }
      continue
    }

    // ── [image:URL] ───────────────────────────────────────────────────────
    if (trimmed.startsWith('[image:') && trimmed.endsWith(']')) {
      const url = trimmed.slice(7, -1)
      out.push(
        `<div class="content-image-wrap"><img src="${esc(url)}" alt="첨부 이미지" class="content-image" loading="lazy"></div>`
      )
      continue
    }

    // ── 영상 URL (YouTube / Chzzk) ────────────────────────────────────────
    const embed = extractEmbedUrl(trimmed)
    if (embed) {
      out.push(
        `<div class="content-video-wrap"><div class="content-video-inner">` +
        `<iframe src="${esc(embed.src)}" title="${esc(embed.label)}" frameborder="0" ` +
        `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>` +
        `</iframe></div></div>`
      )
      continue
    }

    // ── [emoticon:URL] 인라인 ─────────────────────────────────────────────
    out.push(
      line.replace(
        /\[emoticon:([^\]]+)\]/g,
        (_, url) => `<img src="${esc(url)}" alt="이모티콘" class="content-emoticon" loading="lazy">`
      )
    )
  }

  return out.join('\n')
}

// ── DOMPurify 설정 ─────────────────────────────────────────────────────────
const PURIFY_CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allowfullscreen', 'frameborder', 'allow', 'loading', 'align'],
}

// ── 컴포넌트 ───────────────────────────────────────────────────────────────

/**
 * 게시글 본문을 마크다운으로 파싱하여 렌더링한다.
 *
 * 커스텀 마커:
 *   [table:BASE64]        → 모달로 만든 표
 *   [image:URL]           → 첨부 이미지
 *   [emoticon:URL]        → 이모티콘 (인라인)
 *   YouTube / Chzzk URL  → iframe 임베드
 *
 * 마크다운 문법 (GitHub Flavored Markdown):
 *   # ## ### 제목, **굵게**, *기울임*, ~~취소선~~, `코드`, ```블록```,
 *   > 인용, - 목록, 1. 번호목록, --- 구분선, | 표 | 등
 */
export default function ContentRenderer({ content }) {
  const html = useMemo(() => {
    if (!content) return ''
    const preprocessed = preprocessCustomMarkers(content)
    const raw = marked.parse(preprocessed)
    return DOMPurify.sanitize(raw, PURIFY_CONFIG)
  }, [content])

  if (!html) return null
  return <div className="content-renderer" dangerouslySetInnerHTML={{ __html: html }} />
}
