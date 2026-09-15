import { Download, Loader2, Share2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import recapBackground from '@/assets/cta-v1.jpeg'
import { Button } from '@/components/ui/button'
import { SegmentedToggle } from '@/components/ui/segmented-toggle'
import { buildRecapFilename } from '@/lib/filename'
import {
  canvasToPngBlob,
  drawRecapShareCard,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_BACKGROUNDS,
  SHARE_CARD_TEXT_COLORS,
  SHARE_CARD_STYLES,
  SHARE_CARD_WIDTH,
  type ShareCardBackground,
  type ShareCardStyle,
  type ShareCardTextColor,
} from '@/lib/recap-share-card'
import type { MonthlyExerciseRecap } from '@/types/exercise'

const EXPORT_FAILED = "We couldn't create your recap image. Please try again."

/**
 * Preview and export of the recap share card.
 *
 * The preview IS the export canvas, scaled down by CSS — so what is downloaded
 * is exactly what was on screen, at a true 1080x1350 rather than an upscaled
 * screenshot of a small DOM node.
 */
export function ShareCardPreview({
  recap,
  displayName,
}: {
  recap: MonthlyExerciseRecap
  displayName: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [style, setStyle] = useState<ShareCardStyle>('classic')
  const [background, setBackground] = useState<ShareCardBackground>('default')
  const [textColor, setTextColor] = useState<ShareCardTextColor>('light')
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [shareMessage, setShareMessage] = useState('')

  useEffect(() => {
    const image = new Image()
    image.onload = () => setBackgroundImage(image)
    image.onerror = () => setError(EXPORT_FAILED)
    image.src = recapBackground
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      drawRecapShareCard(canvas, {
        recap,
        style,
        background,
        textColor,
        displayName,
        backgroundImage,
      })
    } catch {
      setError(EXPORT_FAILED)
    }
  }, [recap, style, background, textColor, displayName, backgroundImage])

  const withExport = useCallback(
    async (handle: (blob: Blob, filename: string) => Promise<void> | void) => {
      const canvas = canvasRef.current
      if (!canvas || isExporting) return
      setIsExporting(true)
      setError('')
      setShareMessage('')
      try {
        const blob = await canvasToPngBlob(canvas)
        await handle(blob, buildRecapFilename(recap.label))
      } catch {
        setError(EXPORT_FAILED)
      } finally {
        setIsExporting(false)
      }
    },
    [isExporting, recap.label],
  )

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const download = () =>
    void withExport((blob, filename) => {
      downloadBlob(blob, filename)
    })

  const share = () =>
    void withExport(async (blob, filename) => {
      const file = new File([blob], filename, { type: 'image/png' })
      if (!navigator.share || !navigator.canShare?.({ files: [file] })) {
        downloadBlob(blob, filename)
        setShareMessage('Image downloaded — share it to Instagram Stories from your Photos.')
        return
      }
      try {
        await navigator.share({
          files: [file],
          title: `My Sports Buddy ${recap.label} Recap`,
          text: `My ${recap.label} recap on Sports Buddy`,
        })
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') return
        downloadBlob(blob, filename)
        setShareMessage('Image downloaded — share it to Instagram Stories from your Photos.')
      }
    })

  const isCanvasReady = background === 'transparent' || backgroundImage !== null

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div className="mx-auto w-full max-w-sm lg:mx-0 lg:flex-1">
        <canvas
          ref={canvasRef}
          width={SHARE_CARD_WIDTH}
          height={SHARE_CARD_HEIGHT}
          // Drawn at 1080x1350 and displayed smaller, so the 4:5 ratio holds
          // at every width and the export is never upscaled.
          className="aspect-4/5 h-auto w-full rounded-2xl border border-border"
          role="img"
          aria-label={`${recap.label} recap share card: ${recap.totalSessions} sessions across ${recap.activeDays} active days`}
        />
      </div>

      <div className="flex flex-col gap-5 lg:w-72 lg:shrink-0">
        <div className="flex flex-col gap-2">
          <span className="text-caption text-muted-foreground uppercase">Style</span>
          <SegmentedToggle
            options={SHARE_CARD_STYLES.map(({ id, label }) => ({
              value: id,
              label,
            }))}
            value={style}
            onChange={setStyle}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-caption text-muted-foreground uppercase">Background</span>
          <SegmentedToggle
            options={SHARE_CARD_BACKGROUNDS.map(({ id, label }) => ({
              value: id,
              label,
            }))}
            value={background}
            onChange={setBackground}
          />
        </div>

        {background === 'transparent' && (
          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground uppercase">Text color</span>
            <SegmentedToggle
              options={SHARE_CARD_TEXT_COLORS.map(({ id, label }) => ({
                value: id,
                label,
              }))}
              value={textColor}
              onChange={setTextColor}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={download} disabled={isExporting || !isCanvasReady} className="w-full">
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {isExporting ? 'Preparing image…' : 'Download image'}
          </Button>
          <Button
            variant="outline"
            onClick={share}
            disabled={isExporting || !isCanvasReady}
            className="w-full"
          >
            <Share2 className="size-4" />
            Share
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-body-small text-destructive">
            {error}
          </p>
        )}
        {shareMessage && !error && (
          <p className="text-caption text-muted-foreground">{shareMessage}</p>
        )}
      </div>
    </div>
  )
}
