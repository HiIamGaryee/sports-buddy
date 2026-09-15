import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useBuddyRatings } from '@/features/ratings/use-buddy-ratings'
import type {
  AttendanceStatus,
  CompletedActivity,
  Experience,
  Punctuality,
} from '@/types/buddy-rating'
import { cn } from '@/lib/utils'

const ATTENDANCE_OPTIONS = [
  { value: 'attended', label: 'Yes' },
  { value: 'no_show', label: 'No — No-show' },
] as const satisfies readonly { value: AttendanceStatus; label: string }[]

const PUNCTUALITY_OPTIONS = [
  { value: 'on_time', label: 'On time' },
  { value: 'late', label: 'A little late' },
  { value: 'very_late', label: 'Very late' },
] as const satisfies readonly { value: Punctuality; label: string }[]

const EXPERIENCE_OPTIONS = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' },
  { value: 'not_great', label: 'Not great' },
] as const satisfies readonly { value: Experience; label: string }[]

export function RateBuddyDialog({
  activity,
  reviewerId,
  trigger,
}: {
  activity: CompletedActivity
  reviewerId: string
  trigger: React.ReactNode
}) {
  const { submitReview } = useBuddyRatings()
  const [open, setOpen] = useState(false)
  const [confirmNoShow, setConfirmNoShow] = useState(false)
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus | null>(null)
  const [punctuality, setPunctuality] = useState<Punctuality | null>(null)
  const [experience, setExperience] = useState<Experience | null>(null)
  const [note, setNote] = useState('')

  const reset = () => {
    setConfirmNoShow(false)
    setAttendanceStatus(null)
    setPunctuality(null)
    setExperience(null)
    setNote('')
  }

  const close = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset()
  }

  const submit = () => {
    if (!attendanceStatus || (attendanceStatus === 'attended' && !punctuality)) {
      return
    }
    if (attendanceStatus === 'no_show' && !confirmNoShow) {
      setConfirmNoShow(true)
      return
    }

    submitReview({
      eventId: activity.id,
      reviewerId,
      reviewedUserId: activity.buddy.id,
      attendanceStatus,
      punctuality: attendanceStatus === 'attended' ? punctuality : null,
      experience: attendanceStatus === 'attended' ? experience : null,
      note: note.trim(),
    })
    close(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        {confirmNoShow ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirm no-show?</DialogTitle>
              <DialogDescription>
                Use this only if {activity.buddy.name} did not attend the agreed
                session and did not properly resolve it with you.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmNoShow(false)}>
                Go back
              </Button>
              <Button onClick={submit}>Confirm &amp; submit</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rate {activity.buddy.name}</DialogTitle>
              <DialogDescription>
                How did your {activity.activity} session on {activity.date} go?
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1 rounded-xl bg-surface-subtle p-3">
              <span className="text-title text-card-foreground">
                {activity.activity}
              </span>
              <span className="text-body-small text-muted-foreground">
                {activity.venue}
              </span>
              <span className="text-body-small text-muted-foreground">
                {activity.date} · {activity.time}
              </span>
            </div>

            <RatingQuestion title="Did they show up?" required>
              <RatingOptions
                options={ATTENDANCE_OPTIONS}
                value={attendanceStatus}
                onChange={(value) => {
                  setAttendanceStatus(value)
                  if (value === 'no_show') setPunctuality(null)
                }}
              />
            </RatingQuestion>

            {attendanceStatus === 'attended' && (
              <RatingQuestion title="Were they on time?" required>
                <RatingOptions
                  options={PUNCTUALITY_OPTIONS}
                  value={punctuality}
                  onChange={setPunctuality}
                />
              </RatingQuestion>
            )}

            {attendanceStatus === 'attended' && (
              <RatingQuestion title="How was the session?">
                <RatingOptions
                  options={EXPERIENCE_OPTIONS}
                  value={experience}
                  onChange={setExperience}
                />
              </RatingQuestion>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor={`rating-note-${activity.id}`} className="text-title text-card-foreground">
                Anything else? <span className="text-body-small text-muted-foreground">Optional</span>
              </label>
              <Textarea
                id={`rating-note-${activity.id}`}
                value={note}
                maxLength={200}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Keep it useful and respectful."
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={
                  !attendanceStatus ||
                  (attendanceStatus === 'attended' && !punctuality)
                }
              >
                Submit review
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RatingQuestion({
  title,
  required = false,
  children,
}: {
  title: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-title text-card-foreground">
        {title} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </div>
  )
}

function RatingOptions<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-body-small transition-ui focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            value === option.value
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
