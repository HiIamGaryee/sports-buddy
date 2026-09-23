import { useState } from 'react'
import { Camera } from '@capacitor/camera'
import { ScanLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { decodeQrFromImageData } from '@/lib/qr'
import { attendanceService } from '@/services/attendance/attendance-service'
import type { AttendanceRecord } from '@/types/attendance'

const CAMERA_FAILED = "We couldn't open the camera. Please try again."
const NO_CODE_FOUND =
  "We couldn't read that code. Fill more of the frame with the QR, hold steady, and avoid glare on the screen."

/**
 * How the photo is offered to the decoder, in order. A phone camera photo is
 * several thousand pixels wide, and handing all of them to `jsqr` at once
 * mostly FAILS: the code occupies a small part of a very noisy image.
 *
 * So the same photo is tried a few ways — whole frame at two sizes, then the
 * middle of the frame, where someone aiming at a code puts it. The first
 * attempt that decodes wins, and each attempt is cheap.
 */
const DECODE_ATTEMPTS = [
  { maxSize: 1000, crop: 1 },
  { maxSize: 1600, crop: 1 },
  { maxSize: 1000, crop: 0.6 },
  { maxSize: 600, crop: 1 },
] as const

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(CAMERA_FAILED))
    image.src = url
  })
}

async function readQrFromPhotoUrl(url: string): Promise<string | null> {
  const image = await loadImage(url)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error(CAMERA_FAILED)

  for (const { maxSize, crop } of DECODE_ATTEMPTS) {
    const sourceWidth = image.naturalWidth * crop
    const sourceHeight = image.naturalHeight * crop
    const sourceX = (image.naturalWidth - sourceWidth) / 2
    const sourceY = (image.naturalHeight - sourceHeight) / 2
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight))
    canvas.width = Math.max(1, Math.round(sourceWidth * scale))
    canvas.height = Math.max(1, Math.round(sourceHeight * scale))

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    try {
      const payload = decodeQrFromImageData(
        context.getImageData(0, 0, canvas.width, canvas.height),
      )
      if (payload) return payload
    } catch {
      throw new Error(CAMERA_FAILED)
    }
  }

  return null
}

/**
 * A photo of the organizer's QR → an image loaded off-screen → its pixels
 * decoded by `jsqr`. One photo, not a live video stream: simpler, needs no
 * custom camera UI, and `@capacitor/camera` already handles the permission
 * prompt identically on native Android and in a plain browser.
 */
export function ScanCheckInButton({
  activityId,
  userId,
  onCheckedIn,
}: {
  activityId: string
  userId: string
  onCheckedIn: (record: AttendanceRecord) => void
}) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')

  const scan = async () => {
    setIsScanning(true)
    setError('')
    try {
      // Full quality: a compressed photo of a screen loses exactly the sharp
      // black/white edges the decoder needs.
      const photo = await Camera.takePhoto({ quality: 100, saveToGallery: false })
      const source = photo.webPath ?? photo.uri
      if (!source) throw new Error(CAMERA_FAILED)

      const payload = await readQrFromPhotoUrl(source)
      if (!payload) throw new Error(NO_CODE_FOUND)

      const record = await attendanceService.checkInFromScan(payload, activityId, userId, new Date())
      onCheckedIn(record)
    } catch (scanError) {
      // A user closing the camera sheet is not a failure worth a red banner.
      const message = scanError instanceof Error ? scanError.message : CAMERA_FAILED
      if (!/cancell?ed/i.test(message)) setError(message)
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="outline" disabled={isScanning} onClick={() => void scan()}>
        <ScanLine className="size-4" />
        {isScanning ? 'Scanning…' : 'Scan check-in code'}
      </Button>
      {error && (
        <p role="alert" className="text-body-small text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
