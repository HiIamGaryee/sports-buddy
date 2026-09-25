import { useState } from 'react'
import { Camera } from '@capacitor/camera'
import { Keyboard, ScanLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { buildCheckInPayload, normalizeCheckInCode } from '@/lib/attendance'
import { decodeQrFromImageData } from '@/lib/qr'
import { attendanceService } from '@/services/attendance/attendance-service'
import type { AttendanceRecord, CheckInSubjectKind } from '@/types/attendance'

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
  { maxSize: 700, crop: 1 },
  { maxSize: 1000, crop: 0.7 },
  { maxSize: 700, crop: 0.5 },
  { maxSize: 2000, crop: 1 },
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
  kind,
  activityId,
  userId,
  onCheckedIn,
}: {
  kind: CheckInSubjectKind
  activityId: string
  userId: string
  onCheckedIn: (record: AttendanceRecord) => void
}) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const [isTypingOpen, setIsTypingOpen] = useState(false)
  const [typedCode, setTypedCode] = useState('')
  const [isSubmittingCode, setIsSubmittingCode] = useState(false)

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

      const record = await attendanceService.checkInFromScan(kind, payload, activityId, userId, new Date())
      onCheckedIn(record)
    } catch (scanError) {
      // A user closing the camera sheet is not a failure worth a red banner.
      const message = scanError instanceof Error ? scanError.message : CAMERA_FAILED
      if (!/cancell?ed/i.test(message)) setError(message)
    } finally {
      setIsScanning(false)
    }
  }

  const submitTypedCode = async () => {
    // Normalized the same way the host's code was stored, so case and stray
    // spaces never decide whether somebody can check in.
    const code = normalizeCheckInCode(typedCode)
    if (code.length === 0) return
    setIsSubmittingCode(true)
    setError('')
    try {
      const record = await attendanceService.checkInFromScan(
        kind,
        buildCheckInPayload(activityId, code),
        activityId,
        userId,
        new Date(),
      )
      setIsTypingOpen(false)
      setTypedCode('')
      onCheckedIn(record)
    } catch (codeError) {
      setError(codeError instanceof Error ? codeError.message : CAMERA_FAILED)
    } finally {
      setIsSubmittingCode(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/*
        Typing the code is the primary path: the host reads it out to everyone
        at once, and it cannot be defeated by glare, focus or a phone with no
        usable camera. Scanning is the same check-in by another route — the QR
        only carries this code.
      */}
      <Button
        onClick={() => {
          setTypedCode('')
          setError('')
          setIsTypingOpen(true)
        }}
      >
        <Keyboard className="size-4" />
        Enter check-in code
      </Button>
      <Button variant="ghost" size="sm" disabled={isScanning} onClick={() => void scan()}>
        <ScanLine className="size-4" />
        {isScanning ? 'Scanning…' : 'Scan a QR instead'}
      </Button>
      {error && (
        <p role="alert" className="text-body-small text-destructive">
          {error}
        </p>
      )}

      <Dialog open={isTypingOpen} onOpenChange={setIsTypingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter the check-in code</DialogTitle>
            <DialogDescription>
              Ask the host for the code — they can read it out at the venue.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void submitTypedCode()
            }}
          >
            <Input
              value={typedCode}
              onChange={(event) => {
                setTypedCode(event.target.value.toUpperCase())
                setError('')
              }}
              placeholder="COURT7"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            {error && (
              <p role="alert" className="text-body-small text-destructive">
                {error}
              </p>
            )}
            <DialogFooter className="-mx-4 -mb-4">
              <Button type="button" variant="outline" onClick={() => setIsTypingOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingCode || typedCode.trim().length === 0}>
                {isSubmittingCode ? 'Checking in…' : 'Check in'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
