import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { BudgetSelector } from '@/components/profile/budget-selector'
import { SelectableCard } from '@/components/profile/selectable-card'
import { ErrorState } from '@/components/common/error-state'
import { FormField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AREAS } from '@/constants/areas'
import {
  DEFAULT_POST_DURATION_MINUTES,
  JOIN_POLICY_OPTIONS,
  MAX_VENUE_NAME_LENGTH,
  VISIBILITY_OPTIONS,
} from '@/constants/activity-posts'
import { SPORTS } from '@/constants/sports'
import { DiscoverVenuePicker } from '@/features/discover/components/discover-venue-picker'
import { useAuth } from '@/hooks/use-auth'
import { useConnections } from '@/hooks/use-connections'
import { useProfile } from '@/hooks/use-profile'
import { useSafety } from '@/hooks/use-safety'
import {
  addMinutesToLocalDateTime,
  getPostTimeError,
  toDraftFromPost,
} from '@/lib/activity-post'
import { validDocumentId } from '@/lib/ids'
import { getAreaName } from '@/lib/profile-format'
import { describeActivityForSharing } from '@/lib/share'
import { activityPostService } from '@/services/activity-post/activity-post-service'
import { chatService } from '@/services/chat/chat-service'
import { discoverService } from '@/services/discover/discover-service'
import { shareService } from '@/services/share/share-service'
import { cn } from '@/lib/utils'
import { activityPostPath, conversationPath, ROUTES } from '@/routes/routes'
import type { ActivityPost, ActivityPostDraft } from '@/types/activity-post'
import type { AreaId, SportId } from '@/types/sports-profile'

const STEPS = ['Sport', 'Time', 'Budget', 'Venue', 'Joining'] as const
/** An invite has exactly one possible guest, so there is no joining step. */
const INVITE_STEPS = ['Sport', 'Time', 'Budget', 'Venue'] as const

/** `<input type="datetime-local">` wants local wall time, not an ISO instant. */
function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

type EditState =
  | { status: 'creating' }
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'editing'; post: ActivityPost }

/**
 * Posting, INVITING and editing an activity — one form, so a field can never
 * be validated one way on create and another on edit.
 *
 *  - `/discover/post-activity` posts a public or link-only activity.
 *  - `/discover/post-activity/invite/:userId` invites ONE connected buddy
 *    privately (opened from chat); the invite link is sent into your chat.
 *  - `/discover/post-activity/:postId` edits a post; only its author gets
 *    the form.
 */
export function PostActivityPage() {
  const navigate = useNavigate()
  const { postId, userId: rawInviteeId } = useParams<{
    postId: string
    userId: string
  }>()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { connections, getConnectionState, isLoading: isLoadingConnections } =
    useConnections()
  const { blockedIds } = useSafety()
  const isEdit = postId !== undefined
  const isInviteRoute = rawInviteeId !== undefined
  const inviteeId = validDocumentId(rawInviteeId)
  const [inviteeName, setInviteeName] = useState('')

  /** Which kind of activity is being created; an edit or invite is 1v1 already. */
  const [kind, setKind] = useState<'1v1' | null>(
    isEdit || isInviteRoute ? '1v1' : null,
  )
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<ActivityPostDraft>(() => ({
    sportId: profile?.sports[0]?.sportId ?? SPORTS[0]?.id ?? null,
    localDateTime: '',
    localEndDateTime: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Most people post near home; they can change it.
    areaId: profile?.area ?? null,
    venueName: '',
    budget: profile?.budget ?? null,
    // Approval is the safer default for a 1v1: the author picks their buddy.
    // An invite has its one guest already, so it is simply open to them.
    joinPolicy: isInviteRoute ? 'open' : 'approval',
    visibility: isInviteRoute ? 'invite' : 'public',
    invitedId: isInviteRoute ? inviteeId : null,
  }))
  const [editState, setEditState] = useState<EditState>(() =>
    isEdit ? { status: 'loading' } : { status: 'creating' },
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!postId || !user) return
    let active = true
    activityPostService
      .getById(postId)
      .then((post) => {
        if (!active) return
        // Someone else's post, or a missing one, look the same.
        if (!post || post.authorId !== user.id) {
          setEditState({ status: 'unavailable' })
          return
        }
        setDraft(toDraftFromPost(post))
        setEditState({ status: 'editing', post })
      })
      .catch(() => {
        if (active) setEditState({ status: 'unavailable' })
      })
    return () => {
      active = false
    }
  }, [postId, user])

  useEffect(() => {
    if (!inviteeId) return
    let active = true
    discoverService
      .getProfiles([inviteeId])
      .then(([found]) => {
        if (active && found) setInviteeName(found.displayName)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [inviteeId])

  // An invite can only go to someone you are connected with and have not
  // blocked; the rules check the connection again on create.
  const inviteConnection =
    isInviteRoute &&
    inviteeId &&
    !blockedIds.has(inviteeId) &&
    getConnectionState(inviteeId) === 'connected'
      ? (connections.get(inviteeId) ?? null)
      : null

  const update = (patch: Partial<ActivityPostDraft>) => {
    setError('')
    setDraft((current) => ({ ...current, ...patch }))
  }

  const isInviteForm = draft.visibility === 'invite'
  const steps = isInviteForm ? INVITE_STEPS : STEPS
  const isLastStep = step === steps.length - 1
  // Only shown once both ends are filled in, so an empty field is not an error.
  const timeError = getPostTimeError(draft, new Date())
  const shownTimeError =
    draft.localDateTime && draft.localEndDateTime ? timeError : null
  const canContinue = [
    Boolean(draft.sportId),
    timeError === null,
    Boolean(draft.budget),
    Boolean(draft.areaId && draft.venueName.trim()),
    Boolean(draft.joinPolicy),
  ][step]

  const save = async () => {
    if (!user) return
    setIsSaving(true)
    setError('')
    try {
      if (editState.status === 'editing') {
        await activityPostService.update(editState.post, user.id, draft, new Date())
        navigate(-1)
      } else if (inviteConnection) {
        const post = await activityPostService.create(user.id, draft, new Date())
        // The invite already exists and shows under their Invitations, so a
        // message that fails to send must not undo it or strand the user.
        await chatService
          .sendFromElsewhere(
            inviteConnection,
            user.id,
            `I invited you to play: ${describeActivityForSharing(post)} ${shareService.activityUrl(post.id)}`,
          )
          .catch(() => {})
        navigate(conversationPath(inviteConnection.id))
      } else {
        const post = await activityPostService.create(user.id, draft, new Date())
        // Straight to the post, where it can be shared — a link-only post
        // would never appear on Discover.
        navigate(activityPostPath(post.id), { replace: true })
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "We couldn't save your activity. Please try again.",
      )
      setIsSaving(false)
    }
  }

  const header = (
    <AppHeader
      title={
        isEdit
          ? 'Edit activity'
          : isInviteRoute
            ? `Invite ${inviteeName || 'your buddy'}`
            : 'Post an activity'
      }
      subtitle={
        isEdit
          ? 'Change the time, place, sport or budget.'
          : isInviteRoute
            ? 'A private session just for the two of you. Only they can see it.'
            : 'Invite someone to play. Share it, or let people find it on Discover.'
      }
      size="wide"
      variant="detail"
    />
  )

  /*
   * Posting starts by asking WHAT you are posting. Before this, a 1v1 post and
   * a group activity were two different entry points — the 1v1 form here, and
   * a separate "Create activity" button inside Discover's group section — so
   * choosing the other kind meant knowing to go somewhere else.
   */
  if (!isEdit && !isInviteRoute && kind === null) {
    return (
      <>
        {header}
        <PageContainer size="default">
          <div className="flex flex-col gap-4">
            <SelectableCard
              title="1-to-1 activity"
              description="One other person joins you. Good for a hit, a run or a climb with one buddy."
              selected={false}
              onClick={() => setKind('1v1')}
            />
            <SelectableCard
              title="Group activity"
              description="Up to 30 players, open for anyone to join. Good for a game or a session with a crowd."
              selected={false}
              onClick={() => navigate(ROUTES.createGroupActivity)}
            />
          </div>
        </PageContainer>
      </>
    )
  }

  if (isInviteRoute && isLoadingConnections) {
    return (
      <>
        {header}
        <PageContainer size="narrow">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </PageContainer>
      </>
    )
  }

  if (isInviteRoute && !inviteConnection) {
    return (
      <>
        {header}
        <PageContainer size="narrow">
          <ErrorState
            title="You can only invite a connected buddy."
            description="Connect with them first, then invite them from your chat."
          />
        </PageContainer>
      </>
    )
  }

  if (editState.status === 'loading') {
    return (
      <>
        {header}
        <PageContainer size="narrow">
          <Skeleton className="h-64 w-full rounded-2xl" />
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

  const saveLabel = isEdit
    ? 'Save changes'
    : isInviteRoute
      ? 'Send invite'
      : 'Post activity'
  const savingLabel = isEdit ? 'Saving…' : isInviteRoute ? 'Sending…' : 'Posting…'

  const showSave = isEdit && !isLastStep

  return (
    <>
      {header}
      <PageContainer size="narrow">
        <div className="flex flex-col gap-6">
          <ol
            className={`grid gap-2 ${isInviteForm ? 'grid-cols-4' : 'grid-cols-5'}`}
            aria-label="Steps"
          >
            {steps.map((label, index) => (
              <li
                key={label}
                className="flex flex-col gap-2"
                aria-current={index === step ? 'step' : undefined}
              >
                <button
                  type="button"
                  // Editing is a quick change, so any step can be reopened.
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
                <AppDropdown
                  label="What sport?"
                  value={draft.sportId ?? ''}
                  onChange={(value) => update({ sportId: value as SportId })}
                  options={SPORTS.map(({ id, name }) => ({ value: id, label: name }))}
                />
              )}

              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <FormField id="post-when" label="Start time">
                    <Input
                      id="post-when"
                      type="datetime-local"
                      min={toLocalInputValue(new Date())}
                      value={draft.localDateTime}
                      onChange={(event) => {
                        const localDateTime = event.target.value
                        // Suggest a two-hour session until an end is chosen
                        // that still comes after the new start.
                        const keepsEnd =
                          draft.localEndDateTime > localDateTime
                        update({
                          localDateTime,
                          localEndDateTime: keepsEnd
                            ? draft.localEndDateTime
                            : addMinutesToLocalDateTime(
                                localDateTime,
                                DEFAULT_POST_DURATION_MINUTES,
                              ),
                        })
                      }}
                    />
                  </FormField>
                  <FormField
                    id="post-end"
                    label="End time"
                    error={shownTimeError ?? undefined}
                  >
                    <Input
                      id="post-end"
                      type="datetime-local"
                      min={draft.localDateTime || toLocalInputValue(new Date())}
                      value={draft.localEndDateTime}
                      onChange={(event) =>
                        update({ localEndDateTime: event.target.value })
                      }
                    />
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-3">
                  <span className="text-label text-foreground">
                    Budget per person
                  </span>
                  <BudgetSelector
                    value={draft.budget}
                    onChange={(budget) => update({ budget })}
                  />
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
                      initialLocation={draft.venueName.trim() || getAreaName(draft.areaId)}
                      value={draft.venueName}
                      onSelectVenue={(venueName) => update({ venueName })}
                    />
                  )}
                  <FormField
                    id="post-venue"
                    label="Venue"
                    hint={`${draft.venueName.length}/${MAX_VENUE_NAME_LENGTH}`}
                  >
                    <Input
                      id="post-venue"
                      value={draft.venueName}
                      onChange={(event) =>
                        update({ venueName: event.target.value })
                      }
                      placeholder="Choose from OpenStreetMap or enter a venue"
                    />
                  </FormField>
                </div>
              )}

              {step === 4 && !isInviteForm && (
                <div className="flex flex-col gap-6">
                <div
                  role="radiogroup"
                  aria-label="Who can join"
                  className="flex flex-col gap-3"
                >
                  <span className="text-label text-foreground">
                    Who can join?
                  </span>
                  {JOIN_POLICY_OPTIONS.map((option) => (
                    <SelectableCard
                      key={option.id}
                      title={option.label}
                      description={option.description}
                      selected={draft.joinPolicy === option.id}
                      onClick={() => update({ joinPolicy: option.id })}
                    />
                  ))}
                  <span className="text-body-small text-muted-foreground">
                    This is a 1v1 session, so it has one spot. It shows as Full
                    once someone has it.
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Who can see it"
                  className="flex flex-col gap-3"
                >
                  <span className="text-label text-foreground">
                    Who can see it?
                  </span>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <SelectableCard
                      key={option.id}
                      title={option.label}
                      description={option.description}
                      selected={draft.visibility === option.id}
                      onClick={() => update({ visibility: option.id })}
                    />
                  ))}
                  <span className="text-body-small text-muted-foreground">
                    Either way, you can share a link once it is posted.
                  </span>
                </div>
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
                  <Button
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => void save()}
                  >
                    {isSaving ? savingLabel : saveLabel}
                  </Button>
                )}
                <Button
                  className={cn(showSave && 'col-span-2')}
                  disabled={!canContinue || isSaving}
                  onClick={() =>
                    isLastStep
                      ? void save()
                      : setStep((current) => current + 1)
                  }
                >
                  {isLastStep
                    ? isSaving
                      ? savingLabel
                      : saveLabel
                    : 'Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
