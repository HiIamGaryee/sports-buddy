import { formatRecapDuration } from '@/lib/monthly-recap'
import type { MonthlyExerciseRecap } from '@/types/exercise'

/**
 * Draws the recap share card onto a canvas at full export resolution.
 *
 * Canvas rather than a DOM-screenshot library: it needs no new dependency, and
 * it draws at a true 1080x1350 instead of upscaling a ~350px node into a blurry
 * PNG. The on-screen preview renders THIS canvas scaled down by CSS, so the
 * preview and the download are the same pixels — they cannot drift.
 *
 * Every colour comes from the fixed `--share-card-*` tokens, so a card exported
 * in light mode is identical to one exported in dark mode.
 */

export const SHARE_CARD_WIDTH = 1080
export const SHARE_CARD_HEIGHT = 1350

export const SHARE_CARD_STYLES = [
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'photo', label: 'Photo' },
] as const

export type ShareCardStyle = (typeof SHARE_CARD_STYLES)[number]['id']

export type PhotoPosition = 'top' | 'center' | 'bottom'

export interface ShareCardInput {
  recap: MonthlyExerciseRecap
  style: ShareCardStyle
  displayName: string | null
  photo: HTMLImageElement | null
  photoPosition: PhotoPosition
}

/** The fixed export palette. Read once per draw from the document's tokens. */
function readPalette() {
  const fallback = {
    background: '#0b0c10',
    surface: '#15171a',
    foreground: '#f7f8fa',
    muted: '#9aa0a6',
    accent: '#c4ff3d',
    accentEnd: '#a9ea2f',
    scrimStart: 'rgba(11, 12, 16, 0.15)',
    scrimEnd: 'rgba(11, 12, 16, 0.92)',
  }
  if (typeof document === 'undefined') return fallback

  const styles = getComputedStyle(document.documentElement)
  const token = (name: string, backup: string) =>
    styles.getPropertyValue(name).trim() || backup

  return {
    background: token('--share-card-background', fallback.background),
    surface: token('--share-card-surface', fallback.surface),
    foreground: token('--share-card-foreground', fallback.foreground),
    muted: token('--share-card-muted', fallback.muted),
    accent: token('--share-card-accent', fallback.accent),
    accentEnd: token('--share-card-accent-end', fallback.accentEnd),
    scrimStart: token('--share-card-photo-scrim-start', fallback.scrimStart),
    scrimEnd: token('--share-card-photo-scrim-end', fallback.scrimEnd),
  }
}

const FONT_STACK =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

const font = (weight: number, size: number, spacing = 0) => ({
  font: `${weight} ${size}px ${FONT_STACK}`,
  spacing,
})

/** `letterSpacing` is not in older canvas typings but is widely supported. */
type SpacedContext = CanvasRenderingContext2D & { letterSpacing?: string }

function setType(
  context: CanvasRenderingContext2D,
  { font: value, spacing }: { font: string; spacing: number },
) {
  context.font = value
  ;(context as SpacedContext).letterSpacing = `${spacing}px`
}

/**
 * `object-fit: cover` for canvas: fills the card without distorting the photo,
 * anchored top / centre / bottom so a face is not always cropped out.
 */
function drawCoverPhoto(
  context: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  position: PhotoPosition,
) {
  const scale = Math.max(
    SHARE_CARD_WIDTH / photo.naturalWidth,
    SHARE_CARD_HEIGHT / photo.naturalHeight,
  )
  const width = photo.naturalWidth * scale
  const height = photo.naturalHeight * scale
  const offsetX = (SHARE_CARD_WIDTH - width) / 2
  const overflowY = SHARE_CARD_HEIGHT - height
  const offsetY =
    position === 'top' ? 0 : position === 'bottom' ? overflowY : overflowY / 2

  context.drawImage(photo, offsetX, offsetY, width, height)
}

function drawBackground(
  context: CanvasRenderingContext2D,
  input: ShareCardInput,
  palette: ReturnType<typeof readPalette>,
) {
  context.fillStyle = palette.background
  context.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT)

  if (input.style === 'photo' && input.photo) {
    drawCoverPhoto(context, input.photo, input.photoPosition)
    // Scrim, so the type stays legible over a bright or busy photo.
    const scrim = context.createLinearGradient(0, 0, 0, SHARE_CARD_HEIGHT)
    scrim.addColorStop(0, palette.scrimStart)
    scrim.addColorStop(1, palette.scrimEnd)
    context.fillStyle = scrim
    context.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT)
    return
  }

  if (input.style === 'minimal') return

  // Classic: one soft accent wash in the lower third, the brand gradient used
  // as an accent rather than wallpaper.
  const wash = context.createLinearGradient(
    0,
    SHARE_CARD_HEIGHT * 0.45,
    SHARE_CARD_WIDTH,
    SHARE_CARD_HEIGHT,
  )
  wash.addColorStop(0, palette.surface)
  wash.addColorStop(1, palette.background)
  context.fillStyle = wash
  context.fillRect(
    0,
    SHARE_CARD_HEIGHT * 0.45,
    SHARE_CARD_WIDTH,
    SHARE_CARD_HEIGHT * 0.55,
  )
}

export function drawRecapShareCard(
  canvas: HTMLCanvasElement,
  input: ShareCardInput,
) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('share-card-canvas-unavailable')

  canvas.width = SHARE_CARD_WIDTH
  canvas.height = SHARE_CARD_HEIGHT

  const palette = readPalette()
  const { recap } = input
  const margin = 96

  context.save()
  drawBackground(context, input, palette)

  context.textBaseline = 'alphabetic'
  context.textAlign = 'left'

  // ---- Top: brand + who and when
  setType(context, font(700, 30, 6))
  context.fillStyle = palette.accent
  context.fillText('SPORTS BUDDY', margin, margin + 34)

  setType(context, font(600, 44))
  context.fillStyle = palette.foreground
  const heading = input.displayName
    ? `${input.displayName}'s ${recap.label}`
    : recap.label
  context.fillText(truncate(context, heading, SHARE_CARD_WIDTH - margin * 2), margin, margin + 108)

  // ---- Middle: the headline number, given real room
  const centreY = SHARE_CARD_HEIGHT * 0.46
  setType(context, font(800, 260))
  const gradient = context.createLinearGradient(margin, centreY - 180, margin, centreY)
  gradient.addColorStop(0, palette.accent)
  gradient.addColorStop(1, palette.accentEnd)
  context.fillStyle = gradient
  context.fillText(`${recap.totalSessions}`, margin, centreY)

  setType(context, font(700, 34, 8))
  context.fillStyle = palette.foreground
  context.fillText(
    recap.totalSessions === 1 ? 'SESSION' : 'SESSIONS',
    margin,
    centreY + 56,
  )

  // ---- Bottom: sport breakdown, then the supporting stats
  const rows = recap.sports.slice(0, 4)
  let y = SHARE_CARD_HEIGHT - margin - 150 - rows.length * 62

  for (const sport of rows) {
    setType(context, font(500, 40))
    context.fillStyle = palette.foreground
    context.textAlign = 'left'
    context.fillText(truncate(context, sport.label, 620), margin, y)

    setType(context, font(700, 40))
    context.fillStyle = palette.accent
    context.textAlign = 'right'
    context.fillText(`${sport.sessions}`, SHARE_CARD_WIDTH - margin, y)
    y += 62
  }

  context.textAlign = 'left'
  setType(context, font(500, 30, 3))
  context.fillStyle = palette.muted
  context.fillText(buildFooter(recap), margin, SHARE_CARD_HEIGHT - margin)

  context.restore()
}

/** Only facts the recap actually has — never a fabricated stat. */
function buildFooter(recap: MonthlyExerciseRecap): string {
  const parts = [
    `${recap.activeDays} ACTIVE ${recap.activeDays === 1 ? 'DAY' : 'DAYS'}`,
  ]
  if (recap.totalDurationMinutes !== null) {
    parts.push(formatRecapDuration(recap.totalDurationMinutes).toUpperCase())
  }
  return parts.join('  ·  ')
}

function truncate(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) return text
  let result = text
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

/** The canvas as a PNG blob, at full export resolution. */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('share-card-encode-failed'))
    }, 'image/png')
  })
}
