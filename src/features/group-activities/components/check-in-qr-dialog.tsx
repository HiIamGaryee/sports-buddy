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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MAX_CHECK_IN_CODE_LENGTH } from '@/constants/attendance'
import { buildCheckInPayload, normalizeCheckInCode } from '@/lib/attendance'
import { buildQrDataUrl } from '@/lib/qr'
import { attendanceService } from '@/services/attendance/attendance-service'
import type { CheckInSubjectKind } from '@/types/attendance'

/**
 * The host's check-in code, shown at the venue.
 *
 * TYPING the code is the main path: a camera photographing a bright screen is
 * unreliable, and a host can simply call the code out to everyone at once. The
 * host may set their own code (something sayable, like "COURT7"), and the QR
 * stays available underneath for anyone who prefers to scan it — it encodes
 * the same code, rendered fully offline.
 *
 * Saving a new code invalidates the previous one immediately, which is also
 * what makes a leaked or screenshotted code harmless.
 */
export function CheckInQrDialog({
  kind,
  activityId,
  hostId,
  onClose,
}: {
  /** Which collection the code lives under — a group activity or a 1-to-1 post. */
  kind: CheckInSubjectKind
  activityId: string
  /** The organizer of a group activity, or the author of a 1-to-1 post. */
  hostId: string
  onClose: () => void
}) {
  const [code, setCode] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    attendanceService
      .getCheckInCode(kind, activityId, hostId)
      .then((loaded) => {
        if (!active) return
        setCode(loaded)
        setDraft(loaded)
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
  }, [kind, activityId, hostId])

  const save = async () => {
    setIsSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await attendanceService.setCheckInCode(kind, activityId, hostId, draft)
      setCode(saved)
      setDraft(saved)
      setNotice('Code saved. The previous code no longer works.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We couldn't save that code.")
    } finally {
      setIsSaving(false)
    }
  }

  const regenerate = async () => {
    setIsRegenerating(true)
    setError('')
    setNotice('')
    try {
      const fresh = await attendanceService.regenerateCheckInCode(kind, activityId, hostId)
      setCode(fresh)
      setDraft(fresh)
      setNotice('New code generated. The previous code no longer works.')
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

  const isDirty = normalizeCheckInCode(draft) !== (code ?? '')

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-in code</DialogTitle>
          <DialogDescription>
            Read this out at the venue. Everyone who is in types it once to check in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {code === null && !error ? (
            <Skeleton className="h-14 w-full rounded-xl" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="rounded-xl bg-surface-subtle px-4 py-3 text-center font-mono text-heading-3 tracking-widest break-all text-card-foreground select-all">
                {code}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="check-in-code" className="text-label text-card-foreground">
              Set your own code
            </label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="check-in-code"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value.toUpperCase())
                  setError('')
                  setNotice('')
                }}
                placeholder="COURT7"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={MAX_CHECK_IN_CODE_LENGTH}
                className="min-w-0 flex-1"
              />
              <Button disabled={isSaving || !isDirty} onClick={() => void save()}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <p className="text-caption text-muted-foreground">
              Letters and numbers, 4–{MAX_CHECK_IN_CODE_LENGTH} characters. Pick something you can
              say out loud. Saving replaces the old code straight away.
            </p>
          </div>

          {notice && (
            <p role="status" className="text-body-small text-muted-foreground">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="text-body-small text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isRegenerating}
              onClick={() => void regenerate()}
            >
              <RefreshCw className="size-4" />
              {isRegenerating ? 'Generating…' : 'Generate a random one'}
            </Button>
            {code && (
              <Button variant="ghost" size="sm" onClick={() => setShowQr((open) => !open)}>
                <QrCode className="size-4" />
                {showQr ? 'Hide QR' : 'Show QR to scan'}
              </Button>
            )}
          </div>

          {showQr && code && (
            <img
              src={buildQrDataUrl(buildCheckInPayload(activityId, code))}
              alt="Check-in QR code"
              /* `pixelated` keeps the generated image's edges hard when it is
                 scaled up; a blurry QR is what fails to decode. */
              style={{ imageRendering: 'pixelated' }}
              className="size-64 max-w-full self-center rounded-lg border border-border bg-white p-3"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
