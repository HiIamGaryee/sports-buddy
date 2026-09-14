import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { SelectableCard } from '@/components/profile/selectable-card'
import { EmptyState } from '@/components/common/empty-state'
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout'
import { buddyReviewStore } from '@/features/ratings/mock-ratings'
import { useBuddyRatings } from '@/features/ratings/use-buddy-ratings'
import { getInitials } from '@/lib/initials'
import { ROUTES } from '@/routes/routes'
import type {
  AttendanceStatus,
  CompletedActivity,
  Experience,
  Punctuality,
} from '@/types/buddy-rating'

const postActivity = {
  eventId: 'event-001',
  is_done_event: 1,
  activity: 'Badminton',
  venue: 'TPP5 Badminton Court',
  date: '12 Sep 2026',
  time: '7:00 PM',
  participantIds: ['current-user', 'user-002'],
  buddy: {
    id: 'user-002',
    name: 'Jason Lim',
    avatar: null,
  },
} as const satisfies CompletedActivity

const ATTENDANCE_OPTIONS = [
  { title: 'Yes, they came', value: 'attended' },
  { title: 'No, they didn’t show up', value: 'no_show' },
] as const satisfies readonly { title: string; value: AttendanceStatus }[]

const PUNCTUALITY_OPTIONS = [
  { title: 'On time', value: 'on_time' },
  { title: 'A little late', value: 'late' },
  { title: 'Very late', value: 'very_late' },
] as const satisfies readonly { title: string; value: Punctuality }[]

const EXPERIENCE_OPTIONS = [
  { title: 'Great', value: 'great' },
  { title: 'Good', value: 'good' },
  { title: 'Okay', value: 'okay' },
  { title: 'Not great', value: 'not_great' },
] as const satisfies readonly { title: string; value: Experience }[]

type ReviewStep =
  | 'summary'
  | 'attendance'
  | 'punctuality'
  | 'experience'
  | 'note'
  | 'confirm'
  | 'done'

const STANDARD_STEPS: readonly ReviewStep[] = [
  'summary',
  'attendance',
  'punctuality',
  'experience',
  'note',
]

const NO_SHOW_STEPS: readonly ReviewStep[] = [
  'summary',
  'attendance',
  'confirm',
]

export function PostActivityPage() {
  const navigate = useNavigate()
  const { reviews } = useBuddyRatings()
  const alreadyReviewed = reviews.some(
    (review) =>
      review.eventId === postActivity.eventId &&
      review.reviewerId === 'current-user' &&
      review.reviewedUserId === postActivity.buddy.id,
  )
  const [step, setStep] = useState<ReviewStep>(() =>
    alreadyReviewed ? 'done' : 'summary',
  )
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus | null>(null)
  const [punctuality, setPunctuality] = useState<Punctuality | null>(null)
  const [experience, setExperience] = useState<Experience | null>(null)
  const [note, setNote] = useState('')

  const visibleSteps = attendanceStatus === 'no_show' ? NO_SHOW_STEPS : STANDARD_STEPS
  const progress = useMemo(() => {
    const currentStep = step === 'done' ? visibleSteps.length : visibleSteps.indexOf(step)
    return { step: Math.max(currentStep + 1, 1), total: visibleSteps.length }
  }, [step, visibleSteps])

  if (postActivity.is_done_event !== 1) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-gutter py-8">
        <EmptyState
          title="This activity is not ready for review."
          description="Reviews become available after the activity is complete."
        />
      </div>
    )
  }

  const canContinue =
    step === 'summary' ||
    (step === 'attendance' && attendanceStatus !== null) ||
    (step === 'punctuality' && punctuality !== null) ||
    step === 'experience' ||
    step === 'note' ||
    step === 'confirm' ||
    step === 'done'

  const continueFlow = () => {
    if (step === 'summary') return setStep('attendance')
    if (step === 'attendance') {
      return setStep(attendanceStatus === 'no_show' ? 'confirm' : 'punctuality')
    }
    if (step === 'punctuality') return setStep('experience')
    if (step === 'experience') return setStep('note')
    if (step === 'note') return submitReview()
    if (step === 'confirm') return submitReview()
    navigate(ROUTES.discover)
  }

  const goBack = () => {
    if (step === 'summary') return navigate(ROUTES.discover)
    if (step === 'attendance') return setStep('summary')
    if (step === 'punctuality') return setStep('attendance')
    if (step === 'experience') return setStep('punctuality')
    if (step === 'note') return setStep('experience')
    if (step === 'confirm') return setStep('attendance')
  }

  function submitReview() {
    if (!attendanceStatus) return
    try {
      buddyReviewStore.submit({
        eventId: postActivity.eventId,
        reviewerId: 'current-user',
        reviewedUserId: postActivity.buddy.id,
        attendanceStatus,
        punctuality: attendanceStatus === 'attended' ? punctuality : null,
        experience: attendanceStatus === 'attended' ? experience : null,
        note: note.trim(),
      })
    } catch {
      // A duplicate is already complete from the user's perspective.
    }
    setStep('done')
  }

  return (
    <OnboardingLayout
      step={progress.step}
      total={progress.total}
      title={getTitle(step)}
      subtitle={getSubtitle(step)}
      ctaLabel={step === 'done' ? 'Done' : step === 'confirm' ? 'Confirm review' : step === 'summary' ? 'Continue' : 'Continue'}
      ctaDisabled={!canContinue}
      onBack={step === 'done' ? undefined : goBack}
      onContinue={continueFlow}
    >
      {step === 'summary' && <ActivitySummary activity={postActivity} />}
      {step === 'attendance' && (
        <OptionStep
          options={ATTENDANCE_OPTIONS}
          value={attendanceStatus}
          onChange={(value) => setAttendanceStatus(value)}
        />
      )}
      {step === 'punctuality' && (
        <OptionStep
          options={PUNCTUALITY_OPTIONS}
          value={punctuality}
          onChange={setPunctuality}
        />
      )}
      {step === 'experience' && (
        <OptionStep
          options={EXPERIENCE_OPTIONS}
          value={experience}
          onChange={setExperience}
        />
      )}
      {step === 'note' && (
        <div className="flex flex-col gap-2">
          <label htmlFor="post-activity-note" className="text-label text-foreground">
            Anything else?
          </label>
          <p className="text-body-small text-muted-foreground">
            Optional — keep it useful and respectful.
          </p>
          <Textarea
            id="post-activity-note"
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Keep it useful and respectful."
            className="min-h-24"
          />
          <span className="self-end text-caption text-muted-foreground">
            {note.length} / 200
          </span>
        </div>
      )}
      {step === 'confirm' && <NoShowConfirmation buddyName={postActivity.buddy.name} />}
      {step === 'done' && <ReviewComplete buddyName={postActivity.buddy.name} />}
    </OnboardingLayout>
  )
}

function getTitle(step: ReviewStep) {
  if (step === 'summary') return 'How did it go?'
  if (step === 'attendance') return `Did ${postActivity.buddy.name} show up?`
  if (step === 'punctuality') return 'Were they on time?'
  if (step === 'experience') return 'How was playing together?'
  if (step === 'note') return 'Anything else?'
  if (step === 'confirm') return 'Confirm no-show?'
  return 'Review submitted'
}

function getSubtitle(step: ReviewStep) {
  if (step === 'summary') return `${postActivity.activity} with ${postActivity.buddy.name}`
  if (step === 'attendance') return 'Help other players know what to expect.'
  if (step === 'confirm') return 'Only choose this if they did not attend the agreed session.'
  if (step === 'done') return 'Thanks for helping keep the community reliable.'
  return undefined
}

function ActivitySummary({ activity }: { activity: CompletedActivity }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 text-body text-muted-foreground">
        <span>{activity.venue}</span>
        <span>{activity.date} · {activity.time}</span>
      </div>
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {activity.buddy.avatar && (
            <AvatarImage src={activity.buddy.avatar} alt={activity.buddy.name} />
          )}
          <AvatarFallback className="text-heading-2">
            {getInitials(activity.buddy.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-heading-2 text-foreground">{activity.buddy.name}</span>
      </div>
    </div>
  )
}

function OptionStep<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { title: string; value: T }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <SelectableCard
          key={option.value}
          title={option.title}
          selected={value === option.value}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  )
}

function NoShowConfirmation({ buddyName }: { buddyName: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-subtle p-4">
      <p className="text-body text-foreground">
        Only choose this if {buddyName} did not attend the agreed session.
      </p>
    </div>
  )
}

function ReviewComplete({ buddyName }: { buddyName: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
        <CheckCircle2 aria-hidden className="size-8" />
      </span>
      <p className="text-body text-muted-foreground">
        Your review for {buddyName} has been saved.
      </p>
    </div>
  )
}
