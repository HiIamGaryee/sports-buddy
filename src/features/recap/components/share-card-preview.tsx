import { Download, ImagePlus, Loader2, Share2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { SegmentedToggle } from '@/components/ui/segmented-toggle'
import { buildRecapFilename } from '@/lib/filename'
import {
  canvasToPngBlob,
  drawRecapShareCard,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_STYLES,
  SHARE_CARD_WIDTH,
  type PhotoPosition,
  type ShareCardStyle,
} from '@/lib/recap-share-card'
import {
  getPhotoErrorMessage,
  getPhotoRejection,
  PHOTO_ACCEPT_ATTRIBUTE,
} from '@/lib/share-photo'
import type { MonthlyExerciseRecap } from '@/types/exercise'

const EXPORT_FAILED = "We couldn't create your recap image. Please try again."

const POSITION_OPTIONS = [
  { label: 'Top', value: 'top' },
  { label: 'Centre', value: 'center' },
  { label: 'Bottom', value: 'bottom' },
] as const satisfies readonly { label: string; value: PhotoPosition }[]

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [style, setStyle] = useState<ShareCardStyle>('classic')
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoPosition, setPhotoPosition] = useState<PhotoPosition>('center')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  // Derived once at mount rather than in an effect: `navigator.share` exists
  // on desktops that cannot actually share a file, so the file itself is probed.
  const [canShareFiles] = useState(() => {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') {
      return false
    }
    const probe = new File([new Blob()], 'probe.png', { type: 'image/png' })
    return navigator.canShare({ files: [probe] })
  })

  // The object URL is the only trace the photo leaves. Revoked whenever it is
  // replaced and on unmount, so nothing is retained after the dialog closes.
  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    },
    [photoUrl],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      drawRecapShareCard(canvas, {
        recap,
        style,
        displayName,
        photo,
        photoPosition,
      })
    } catch {
      setError(EXPORT_FAILED)
    }
  }, [recap, style, displayName, photo, photoPosition])

  const choosePhoto = useCallback((file: File | null) => {
    const rejection = getPhotoRejection(file)
    if (rejection || !file) {
      setError(getPhotoErrorMessage(rejection ?? 'empty'))
      return
    }

    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setError('')
      setPhotoUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return url
      })
      setPhoto(image)
      setStyle('photo')
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      setError(getPhotoErrorMessage('empty'))
    }
    image.src = url
  }, [])

  const clearPhoto = useCallback(() => {
    setPhoto(null)
    setStyle('classic')
    setPhotoUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return null
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const withExport = useCallback(
    async (handle: (blob: Blob, filename: string) => Promise<void> | void) => {
      const canvas = canvasRef.current
      if (!canvas || isExporting) return
      setIsExporting(true)
      setError('')
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

  const download = () =>
    void withExport((blob, filename) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    })

  const share = () =>
    void withExport(async (blob, filename) => {
      const file = new File([blob], filename, { type: 'image/png' })
      if (!navigator.canShare?.({ files: [file] })) return
      try {
        await navigator.share({ files: [file], title: `${recap.label} recap` })
      } catch {
        // A cancelled share sheet is a choice, not a failure.
      }
    })

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
            onChange={(next) => {
              if (next === 'photo' && !photo) {
                fileInputRef.current?.click()
                return
              }
              setStyle(next)
            }}
          />
        </div>

        {photo && (
          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground uppercase">
              Photo position
            </span>
            <SegmentedToggle
              options={POSITION_OPTIONS}
              value={photoPosition}
              onChange={setPhotoPosition}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={PHOTO_ACCEPT_ATTRIBUTE}
            className="sr-only"
            aria-label="Choose a background photo"
            onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <ImagePlus className="size-4" />
            {photo ? 'Change photo' : 'Choose photo'}
          </Button>
          {photo && (
            <Button variant="ghost" onClick={clearPhoto} className="w-full">
              <X className="size-4" />
              Remove photo
            </Button>
          )}
          <p className="text-caption text-muted-foreground">
            Your photo stays on this device. It is never uploaded.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={download} disabled={isExporting} className="w-full">
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {isExporting ? 'Preparing image…' : 'Download image'}
          </Button>
          {canShareFiles && (
            <Button
              variant="outline"
              onClick={share}
              disabled={isExporting}
              className="w-full"
            >
              <Share2 className="size-4" />
              Share
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="text-body-small text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
