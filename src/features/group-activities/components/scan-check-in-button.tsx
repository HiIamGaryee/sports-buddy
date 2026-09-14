import { useState } from 'react'
import { Camera } from '@capacitor/camera'
import { ScanLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { decodeQrFromImageData } from '@/lib/qr'
import { attendanceService } from '@/services/attendance/attendance-service'
import type { AttendanceRecord } from '@/types/attendance'

const CAMERA_FAILED = "We couldn't open the camera. Please try again."
const NO_CODE_FOUND = "We couldn't read a code in that photo. Try lining it up again."

/**
 * A photo of the organizer's QR → an image loaded off-screen → its pixels
 * decoded by `jsqr`. One photo, not a live video stream: simpler, needs no
 * custom camera UI, and `@capacitor/camera` already handles the permission
 * prompt identically on native Android and in a plain browser.
 */
function readQrFromPhotoUrl(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error(CAMERA_FAILED))
        return
      }
      context.drawImage(image, 0, 0)
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        resolve(decodeQrFromImageData(imageData))
      } catch {
        reject(new Error(CAMERA_FAILED))
      }
    }
    image.onerror = () => reject(new Error(CAMERA_FAILED))
    image.src = url
  })
}

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
      const photo = await Camera.takePhoto({ quality: 70, saveToGallery: false })
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
