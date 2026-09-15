import { APP_NAME } from '@/constants/app'
import { RECAP_CARD_HEIGHT, RECAP_CARD_WIDTH } from '@/constants/recap'
import { getSportName } from '@/lib/profile-format'
import type { MonthlyRecap } from '@/types/recap'

/**
 * Renders a `MonthlyRecap` as a shareable PNG — a card image with the app
 * name on it, matching the on-screen `RecapCard`. Pure Canvas 2D, no image
 * library and no network call: nothing about a member's activity ever
 * leaves the device except inside the file the OS share sheet sends.
 *
 * Colours are read from the page's OWN resolved theme tokens
 * (`getComputedStyle`), never hardcoded, so a shared image matches whichever
 * theme the member is actually using.
 */

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function themeColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
}

/** Cuts `text` to fit `maxWidth`, adding an ellipsis, rather than overflowing the card. */
function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && context.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

export async function buildRecapImageFile(
  recap: MonthlyRecap,
  memberName: string,
): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = RECAP_CARD_WIDTH
  canvas.height = RECAP_CARD_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error("This device can't create a share image.")

  const background = themeColor('--background', '#0b0c10')
  const card = themeColor('--card', '#17191f')
  const cardForeground = themeColor('--card-foreground', '#f7f8fa')
  const mutedForeground = themeColor('--muted-foreground', '#9ba1ae')
  const primary = themeColor('--primary', '#c4ff3d')
  const gradientStart = themeColor('--primary-gradient-start', primary)
  const gradientEnd = themeColor('--primary-gradient-end', primary)
  const border = themeColor('--border', mutedForeground)

  const pad = 56
  const cardX = pad
  const cardY = pad
  const cardWidth = RECAP_CARD_WIDTH - pad * 2
  const cardHeight = RECAP_CARD_HEIGHT - pad * 2

  context.fillStyle = background
  context.fillRect(0, 0, RECAP_CARD_WIDTH, RECAP_CARD_HEIGHT)

  roundedRect(context, cardX, cardY, cardWidth, cardHeight, 28)
  context.fillStyle = card
  context.fill()
  context.strokeStyle = border
  context.lineWidth = 1
  context.stroke()

  // The same gradient accent bar the on-screen card uses at its top edge.
  const gradientBarHeight = 10
  roundedRect(context, cardX, cardY, cardWidth, gradientBarHeight * 2, 28)
  context.save()
  context.clip()
  const barGradient = context.createLinearGradient(cardX, 0, cardX + cardWidth, 0)
  barGradient.addColorStop(0, gradientStart)
  barGradient.addColorStop(1, gradientEnd)
  context.fillStyle = barGradient
  context.fillRect(cardX, cardY, cardWidth, gradientBarHeight)
  context.restore()

  const innerX = cardX + 48
  const innerWidth = cardWidth - 96
  let cursorY = cardY + 80

  context.textBaseline = 'alphabetic'
  context.fillStyle = mutedForeground
  context.font = `700 20px ${FONT_STACK}`
  context.fillText(APP_NAME.toUpperCase(), innerX, cursorY)
  const rightLabel = 'MONTHLY RECAP'
  context.textAlign = 'right'
  context.fillText(rightLabel, innerX + innerWidth, cursorY)
  context.textAlign = 'left'

  cursorY += 64
  context.fillStyle = cardForeground
  context.font = `600 40px ${FONT_STACK}`
  context.fillText(fitText(context, `${memberName}'s`, innerWidth), innerX, cursorY)

  cursorY += 56
  const monthGradient = context.createLinearGradient(innerX, 0, innerX + innerWidth, 0)
  monthGradient.addColorStop(0, gradientStart)
  monthGradient.addColorStop(1, gradientEnd)
  context.fillStyle = monthGradient
  context.font = `800 52px ${FONT_STACK}`
  context.fillText(fitText(context, recap.monthLabel, innerWidth), innerX, cursorY)

  cursorY += 72
  if (recap.sports.length === 0) {
    context.fillStyle = mutedForeground
    context.font = `400 26px ${FONT_STACK}`
    context.fillText('No sessions yet this month — go play something.', innerX, cursorY)
    cursorY += 40
  } else {
    for (const entry of recap.sports) {
      context.fillStyle = cardForeground
      context.font = `600 30px ${FONT_STACK}`
      context.fillText(fitText(context, getSportName(entry.sportId), innerWidth * 0.7), innerX, cursorY)
      context.fillStyle = mutedForeground
      context.font = `600 30px ${FONT_STACK}`
      context.textAlign = 'right'
      context.fillText(`×${entry.count}`, innerX + innerWidth, cursorY)
      context.textAlign = 'left'
      cursorY += 48
    }
  }

  if (recap.totalSessions > 0) {
    cursorY += 24
    context.strokeStyle = border
    context.beginPath()
    context.moveTo(innerX, cursorY)
    context.lineTo(innerX + innerWidth, cursorY)
    context.stroke()

    cursorY += 64
    context.fillStyle = cardForeground
    context.font = `800 48px ${FONT_STACK}`
    context.fillText(String(recap.verifiedSessions), innerX, cursorY)
    const showUpX = innerX + innerWidth * 0.55
    context.fillText(
      recap.showUpRatePercent === null ? '—' : `${recap.showUpRatePercent}%`,
      showUpX,
      cursorY,
    )

    cursorY += 32
    context.fillStyle = mutedForeground
    context.font = `600 18px ${FONT_STACK}`
    context.fillText('VERIFIED SESSIONS', innerX, cursorY)
    context.fillText('SHOW-UP RATE', showUpX, cursorY)
  }

  context.fillStyle = mutedForeground
  context.font = `400 18px ${FONT_STACK}`
  context.textAlign = 'center'
  context.fillText(`Shared from ${APP_NAME}`, RECAP_CARD_WIDTH / 2, cardY + cardHeight - 32)
  context.textAlign = 'left'

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error("This device can't create a share image.")

  return new File([blob], `sports-buddy-recap-${recap.monthKey}.png`, { type: 'image/png' })
}
