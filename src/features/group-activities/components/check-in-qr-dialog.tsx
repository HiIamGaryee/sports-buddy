import { useEffect, useState } from 'react'
import { QrCode, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { buildCheckInPayload } from '@/lib/attendance'
import { buildQrDataUrl } from '@/lib/qr'
import { attendanceService } from '@/services/attendance/attendance-service'

/**
 * The organizer's check-in QR, shown at the venue. Generated fully offline —
 * `buildQrDataUrl` never touches the network — so it works with no signal
 * once it has loaded. "Regenerate" invalidates a leaked or screenshotted
 * code immediately (the old one stops working the moment this saves).
 */
export function CheckInQrDialog({
  activityId,
  organizerId,
  onClose,
}: {
  activityId: string
  organizerId: string
  onClose: () => void
}) {
  const [code, setCode] = useState<string | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    attendanceService
      .getCheckInCode(activityId, organizerId)
      .then((loaded) => {
        if (active) setCode(loaded)
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : "We couldn't show a check-in code.",
          )
        }
      })
    return () => {
      active = false
    }
  }, [activityId, organizerId])

  const regenerate = async () => {
    setIsRegenerating(true)
    setError('')
    try {
      setCode(await attendanceService.regenerateCheckInCode(activityId, organizerId))
    } catch (regenerateError) {
      setError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "We couldn't regenerate the code.",
      )
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-in code</DialogTitle>
          <DialogDescription>
            Show this to players at the venue. Each of them scans it once to check in.
            Turn your screen brightness up if someone is photographing it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {code ? (
            <img
              src={buildQrDataUrl(buildCheckInPayload(activityId, code))}
              alt="Check-in QR code"
              /* Rendered large, and `pixelated` so scaling the generated
                 image up keeps hard edges instead of blurring them — a blurry
                 QR is the main reason a photo fails to decode. */
              style={{ imageRendering: 'pixelated' }}
              className="size-72 max-w-full rounded-lg border border-border bg-white p-3"
            />
          ) : error ? (
            <QrCode aria-hidden className="size-16 text-muted-foreground" />
          ) : (
            <Skeleton className="size-72 rounded-lg" />
          )}

          {error && (
            <p role="alert" className="text-body-small text-destructive">
              {error}
            </p>
          )}

          <Button variant="outline" disabled={isRegenerating} onClick={() => void regenerate()}>
            <RefreshCw className="size-4" />
            {isRegenerating ? 'Regenerating…' : 'Regenerate code'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
