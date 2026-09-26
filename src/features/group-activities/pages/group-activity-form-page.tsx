import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { BudgetSelector } from '@/components/profile/budget-selector'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  MAX_GROUP_ACTIVITY_DESCRIPTION_LENGTH,
  MAX_GROUP_ACTIVITY_PARTICIPANTS,
  MAX_GROUP_ACTIVITY_TITLE_LENGTH,
  MAX_GROUP_ACTIVITY_VENUE_NAME_LENGTH,
  MIN_GROUP_ACTIVITY_PARTICIPANTS,
  SKILL_PREFERENCE_OPTIONS,
} from '@/constants/group-activities'
import { AREAS } from '@/constants/areas'
import { FREE_MAX_HOSTED_GROUP_ACTIVITIES } from '@/constants/entitlements'
import { SPORTS } from '@/constants/sports'
import { DiscoverVenuePicker } from '@/features/discover/components/discover-venue-picker'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { useSubscription } from '@/hooks/use-subscription'
import { canHostAnotherGroupActivity } from '@/lib/capabilities'
import { isUpcomingGroupActivity, toDraftFromGroupActivity } from '@/lib/group-activity'
import { getAreaName } from '@/lib/profile-format'
import { groupActivityService } from '@/services/group-activity/group-activity-service'
import { cn } from '@/lib/utils'
import { groupActivityDetailPath, ROUTES } from '@/routes/routes'
import type { GroupActivity, GroupActivityDraft } from '@/types/group-activity'
import type { SkillPreference } from '@/types/group-activity'
import type { AreaId, SportId } from '@/types/sports-profile'

const STEPS = ['Sport & title', 'Time', 'Budget', 'Venue', 'Players'] as const

/** `<input type="datetime-local">` wants local wall time, not an ISO instant. */
function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type EditState =
  | { status: 'creating' }
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'editing'; activity: GroupActivity }

/**
 * Creating AND editing a public group activity — one form, so a field can
 * never be validated one way on create and another on edit. With a
 * `:activityId` in the route it loads that activity; only its organizer
 * gets the form. Always public and always open-join — see `docs/group-activities.md`.
 */
export function GroupActivityFormPage() {
  const navigate = useNavigate()
  const { activityId } = useParams<{ activityId: string }>()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { state: subscriptionState } = useSubscription()
  const isEdit = activityId !== undefined

  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<GroupActivityDraft>(() => ({
    sportId: profile?.sports[0]?.sportId ?? SPORTS[0]?.id ?? null,
    title: '',
    description: '',
    localStartDateTime: '',
    localEndDateTime: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    areaId: profile?.area ?? null,
    venueName: '',
    budget: profile?.budget ?? null,
    preferredSkillLevel: 'any',
    maxParticipants: 8,
  }))
  const [editState, setEditState] = useState<EditState>(() =>
    isEdit ? { status: 'loading' } : { status: 'creating' },
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  /**
   * The free hosting cap, checked BEFORE the form is filled in. Finding out
   * you are at the limit after writing five steps of detail is the worst
   * possible moment, so creating is gated up front; the service still
   * re-checks on save, because the limit is not the UI's to enforce.
   */
  const [hostLimit, setHostLimit] = useState<'checking' | 'allowed' | 'reached'>(
    isEdit ? 'allowed' : 'checking',
  )

  useEffect(() => {
    if (isEdit || !user) return
    // Wait for the entitlement to resolve: 'loading' fails closed, which
    // would otherwise gate a Buddy+ member out of their own feature.
    if (subscriptionState === 'loading' || subscriptionState === 'unknown') return

    let active = true
    groupActivityService
      .listMine(user.id)
      .then((hosted) => {
        if (!active) return
        const now = new Date()
        const activeHosted = hosted.filter((activity) => isUpcomingGroupActivity(activity, now))
        setHostLimit(
          canHostAnotherGroupActivity(subscriptionState, activeHosted.length)
            ? 'allowed'
            : 'reached',
        )
      })
      .catch(() => {
        // A failed count must not block hosting; the service re-checks on save.
        if (active) setHostLimit('allowed')
      })
    return () => {
      active = false
    }
  }, [isEdit, user, subscriptionState])

  useEffect(() => {
    if (!activityId || !user) return
    let active = true
    groupActivityService
      .getById(activityId)
      .then((activity) => {
        if (!active) return
        if (!activity || activity.organizerId !== user.id) {
          setEditState({ status: 'unavailable' })
          return
        }
        setDraft(toDraftFromGroupActivity(activity))
        setEditState({ status: 'editing', activity })
      })
      .catch(() => {
        if (active) setEditState({ status: 'unavailable' })
      })
    return () => {
      active = false
    }
  }, [activityId, user])

  const update = (patch: Partial<GroupActivityDraft>) => {
    setError('')
    setDraft((current) => ({ ...current, ...patch }))
  }

  const isLastStep = step === STEPS.length - 1
  const canContinue = [
    Boolean(draft.sportId) && draft.title.trim().length > 0,
    Boolean(draft.localStartDateTime),
    Boolean(draft.budget),
    Boolean(draft.areaId && draft.venueName.trim()),
    draft.maxParticipants >= MIN_GROUP_ACTIVITY_PARTICIPANTS,
  ][step]

  const save = async () => {
    if (!user) return
    setIsSaving(true)
    setError('')
    try {
      if (editState.status === 'editing') {
        await groupActivityService.update(editState.activity, user.id, draft, new Date())
        navigate(groupActivityDetailPath(editState.activity.id), { replace: true })
      } else {
        const activity = await groupActivityService.create(
          user.id,
          draft,
          new Date(),
          subscriptionState,
        )
        navigate(groupActivityDetailPath(activity.id), { replace: true })
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We couldn't save this activity. Please try again.",
      )
      setIsSaving(false)
    }
  }

  const header = (
    <AppHeader
      title={isEdit ? 'Edit activity' : 'Create a group activity'}
      subtitle={
        isEdit
          ? 'Change the time, place, sport or player count.'
          : 'Anyone can find and join it once it is posted.'
      }
      size="wide"
      variant="detail"
    />
  )

  if (editState.status === 'loading' || hostLimit === 'checking') {
    return (
      <>
        {header}
        <PageContainer size="narrow">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </PageContainer>
      </>
    )
  }

  if (hostLimit === 'reached') {
    return (
      <>
        {header}
        <PageContainer size="narrow">
          <Card variant="subtle">
            <CardContent className="flex flex-col items-start gap-4">
              <span className="text-heading-3 font-bold text-card-foreground">
                You&apos;re hosting the maximum for a free plan
              </span>
              <p className="text-body-small text-muted-foreground">
                Free members host {FREE_MAX_HOSTED_GROUP_ACTIVITIES} group activities at a time.
                Once one of yours finishes, or if you remove one, a slot opens up again. Buddy+
                removes the limit.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to={ROUTES.paywall}>
                    <Sparkles className="size-4" aria-hidden />
                    See Buddy+
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={ROUTES.activities}>My activities</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </>
    )
  }

  if (editState.status === 'unavailable') {
    return (
      <>
        {header}
        <PageContainer size="narrow">
          <ErrorState title="This activity is unavailable." />
        </PageContainer>
      </>
    )
  }

  const saveLabel = isEdit ? 'Save changes' : 'Create activity'
  const savingLabel = isEdit ? 'Saving…' : 'Creating…'

  const showSave = isEdit && !isLastStep

  return (
    <>
      {header}
      <PageContainer size="narrow">
        <div className="flex flex-col gap-6">
          <ol className="grid grid-cols-5 gap-2" aria-label="Steps">
            {STEPS.map((label, index) => (
              <li
                key={label}
                className="flex flex-col gap-2"
                aria-current={index === step ? 'step' : undefined}
              >
                <button
                  type="button"
                  disabled={!isEdit}
                  onClick={() => setStep(index)}
                  className="flex flex-col gap-2 text-left disabled:cursor-default"
                >
                  <span
                    className={`h-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-muted'}`}
                  />
                  <span
                    className={`text-caption ${index === step ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {label}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <Card>
            <CardContent className="flex flex-col gap-5">
              {step === 0 && (
                <div className="flex flex-col gap-5">
                  <AppDropdown
                    label="What sport?"
                    value={draft.sportId ?? ''}
                    onChange={(value) => update({ sportId: value as SportId })}
                    options={SPORTS.map(({ id, name }) => ({ value: id, label: name }))}
                  />
                  <FormField
                    id="group-activity-title"
                    label="Title"
                    hint={`${draft.title.length}/${MAX_GROUP_ACTIVITY_TITLE_LENGTH}`}
                  >
                    <Input
                      id="group-activity-title"
                      value={draft.title}
                      onChange={(event) => update({ title: event.target.value })}
                      placeholder="e.g. Saturday Badminton Meetup"
                      maxLength={MAX_GROUP_ACTIVITY_TITLE_LENGTH}
                    />
                  </FormField>
                  <FormField
                    id="group-activity-description"
                    label="Description (optional)"
                    hint={`${draft.description.length}/${MAX_GROUP_ACTIVITY_DESCRIPTION_LENGTH}`}
                  >
                    <Textarea
                      id="group-activity-description"
                      value={draft.description}
                      onChange={(event) => update({ description: event.target.value })}
                      placeholder="What should people know before joining?"
                      maxLength={MAX_GROUP_ACTIVITY_DESCRIPTION_LENGTH}
                      rows={4}
                    />
                  </FormField>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <FormField id="group-activity-start" label="When does it start?">
                    <Input
                      id="group-activity-start"
                      type="datetime-local"
                      min={toLocalInputValue(new Date())}
                      value={draft.localStartDateTime}
                      onChange={(event) => update({ localStartDateTime: event.target.value })}
                    />
                  </FormField>
                  <FormField id="group-activity-end" label="End time (optional)">
                    <Input
                      id="group-activity-end"
                      type="datetime-local"
                      min={draft.localStartDateTime || toLocalInputValue(new Date())}
                      value={draft.localEndDateTime}
                      onChange={(event) => update({ localEndDateTime: event.target.value })}
                    />
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-3">
                  <span className="text-label text-foreground">Estimated price per person</span>
                  <BudgetSelector value={draft.budget} onChange={(budget) => update({ budget })} />
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-5">
                  <AppDropdown
                    label="Area"
                    value={draft.areaId ?? ''}
                    onChange={(value) => update({ areaId: value as AreaId })}
                    options={AREAS.map(({ id, name }) => ({ value: id, label: name }))}
                    placeholder="Select an area"
                  />
                  {draft.areaId && (
                    <DiscoverVenuePicker
                      key={`${draft.sportId}-${draft.areaId}`}
                      sportId={draft.sportId ?? SPORTS[0]?.id ?? 'badminton'}
                      initialLocation={getAreaName(draft.areaId)}
                      value={draft.venueName}
                      onSelectVenue={(venueName) => update({ venueName })}
                    />
                  )}
                  <FormField
                    id="group-activity-venue"
                    label="Venue"
                    hint={`${draft.venueName.length}/${MAX_GROUP_ACTIVITY_VENUE_NAME_LENGTH}`}
                  >
                    <Input
                      id="group-activity-venue"
                      value={draft.venueName}
                      onChange={(event) => update({ venueName: event.target.value })}
                      placeholder="Choose from OpenStreetMap or enter a venue"
                    />
                  </FormField>
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col gap-5">
                  <FormField
                    id="group-activity-max"
                    label="Maximum players"
                    hint={`${MIN_GROUP_ACTIVITY_PARTICIPANTS}–${MAX_GROUP_ACTIVITY_PARTICIPANTS}`}
                  >
                    <Input
                      id="group-activity-max"
                      type="number"
                      min={MIN_GROUP_ACTIVITY_PARTICIPANTS}
                      max={MAX_GROUP_ACTIVITY_PARTICIPANTS}
                      value={draft.maxParticipants}
                      onChange={(event) =>
                        update({ maxParticipants: Number(event.target.value) || 0 })
                      }
                    />
                  </FormField>
                  <AppDropdown
                    label="Preferred skill level"
                    value={draft.preferredSkillLevel}
                    onChange={(value) => update({ preferredSkillLevel: value as SkillPreference })}
                    options={SKILL_PREFERENCE_OPTIONS.map(({ id, label }) => ({
                      value: id,
                      label,
                    }))}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="text-body-small text-destructive">
                  {error}
                </p>
              )}

              {/* Phone: two buttons per row, so with Save showing,
                  Continue drops to its own full-width row. From `sm`
                  it is one row again, Cancel/Back on the left. */}
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <Button
                  variant="outline"
                  className="sm:mr-auto"
                  disabled={isSaving}
                  onClick={() =>
                    step > 0
                      ? setStep((current) => current - 1)
                      : isEdit
                        ? navigate(-1)
                        : navigate(ROUTES.discover)
                  }
                >
                  {step === 0 ? 'Cancel' : 'Back'}
                </Button>
                {showSave && (
                  <Button variant="outline" disabled={isSaving} onClick={() => void save()}>
                    {isSaving ? savingLabel : saveLabel}
                  </Button>
                )}
                <Button
                  className={cn(showSave && 'col-span-2')}
                  disabled={!canContinue || isSaving}
                  onClick={() =>
                    isLastStep ? void save() : setStep((current) => current + 1)
                  }
                >
                  {isLastStep ? (isSaving ? savingLabel : saveLabel) : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
