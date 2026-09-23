import { useState } from 'react'
import { CalendarClock, Check, History, MapPin, QrCode, ShieldCheck, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { SKILL_PREFERENCE_OPTIONS } from '@/constants/group-activities'
import { CheckInQrDialog } from '@/features/group-activities/components/check-in-qr-dialog'
import { ScanCheckInButton } from '@/features/group-activities/components/scan-check-in-button'
import { ShareGroupActivityActions } from '@/features/group-activities/components/share-group-activity-actions'
import { useGroupActivityActions } from '@/features/group-activities/use-group-activity-actions'
import { CHECK_IN_GRACE_MINUTES } from '@/constants/attendance'
import { isCheckInOpen, toCheckInSubject } from '@/lib/attendance'
import { formatActivityDate, formatActivityTime } from '@/lib/activity-format'
import {
  getGroupActivityViewerState,
  groupActivitySpotsLeft,
  hasGroupActivityEnded,
  isGroupActivityFull,
} from '@/lib/group-activity'
import { getInitials } from '@/lib/initials'
import { formatBudget, getAreaName, getSportName } from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import { buddyProfilePath, editGroupActivityPath, groupActivityDetailPath } from '@/routes/routes'
import type { GroupActivity } from '@/types/group-activity'
import type { DiscoveryProfile } from '@/types/discovery-profile'

type Busy = 'idle' | 'join' | 'leave' | 'remove' | `remove:${string}`

const skillLabel = (id: GroupActivity['preferredSkillLevel']) =>
  SKILL_PREFERENCE_OPTIONS.find((option) => option.id === id)?.label ?? 'Any skill level'

/**
 * One PUBLIC group activity, read top to bottom: WHAT (sport + title), WHO
 * is organizing, WHERE, HOW MUCH, WHEN, how many spots are left — then the
 * action for THIS viewer, from `getGroupActivityViewerState()`.
 *
 * The organizer instead sees the participant list with a per-person Remove,
 * plus Edit and Remove for the activity itself.
 */
export function GroupActivityCard({
  activity,
  people,
  now,
  onChanged,
  onRemove,
  linkToDetail = true,
}: {
  activity: GroupActivity
  people: ReadonlyMap<string, DiscoveryProfile>
  now: Date
  onChanged: () => void
  onRemove?: (activityId: string) => Promise<void>
  /** The title links to the detail page everywhere except the detail page itself. */
  linkToDetail?: boolean
}) {
  const { viewerId, join, leave, removeParticipant } = useGroupActivityActions(onChanged)
  const [busy, setBusy] = useState<Busy>('idle')
  const [error, setError] = useState('')
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)

  const viewerState = viewerId ? getGroupActivityViewerState(activity, viewerId, now) : 'past'
  const isOrganizer = viewerState === 'organizer'
  const organizer = people.get(activity.organizerId)
  const organizerName = organizer?.displayName ?? 'Sports buddy'
  const full = isGroupActivityFull(activity)
  const spotsLeft = groupActivitySpotsLeft(activity)
  // Named for "the start time has passed" (this activity is no longer
  // upcoming) — also exactly when QR check-in becomes available.
  const isPast = new Date(activity.startAt).getTime() <= now.getTime()
  const hasStarted = isPast
  // Check-in runs from the start time until shortly after the end, so an
  // old activity no longer offers a code or a scanner.
  const checkInOpen = isCheckInOpen(toCheckInSubject(activity), now)
  // Genuinely finished, for the "reads as history" surface treatment — a
  // session in progress still looks live, matching the Activities page's
  // Planned/Past split (`hasGroupActivityEnded`).
  const isEnded = hasGroupActivityEnded(activity, now)

  const run = async (mode: Busy, action: () => Promise<unknown>) => {
    if (busy !== 'idle') return
    setBusy(mode)
    setError('')
    try {
      await action()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setBusy('idle')
    }
  }

  const titleBlock = (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-heading-3 text-card-foreground">{activity.title}</span>
      <span className="text-body-small text-muted-foreground">
        {isOrganizer ? 'Hosted by you' : `Hosted by ${organizerName}`}
      </span>
    </div>
  )

  return (
    <article
      className={cn(
        'group/card h-full',
        // History reads calm rather than disabled: the same treatment
        // `ActivityCard` gives a past confirmed session, so a past group
        // activity you joined and a past confirmed session look like one
        // system.
        isEnded
          ? 'min-h-72 rounded-[1.875rem] border border-border bg-surface-subtle shadow-none'
          : 'opportunity-card',
      )}
    >
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-11 shrink-0">
            {organizer?.photoUrl && <AvatarImage src={organizer.photoUrl} alt="" />}
            <AvatarFallback className="text-title">
              {getInitials(organizer?.displayName ?? (isOrganizer ? 'You' : organizerName))}
            </AvatarFallback>
          </Avatar>
          {linkToDetail ? (
            <Link to={groupActivityDetailPath(activity.id)} className="min-w-0 flex-1">
              {titleBlock}
            </Link>
          ) : (
            titleBlock
          )}
          {isEnded ? (
            <StatusPill tone="neutral" icon={History}>
              Past
            </StatusPill>
          ) : (
            <StatusPill tone={full ? 'neutral' : 'success'} icon={full ? Check : Users}>
              {full ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'}`}
            </StatusPill>
          )}
        </div>

        <dl className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <dt className="sr-only">Location</dt>
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <dd className="min-w-0 text-body text-card-foreground">
              <span className="block truncate">{activity.venueName}</span>
              <span className="block text-body-small text-muted-foreground">
                {getAreaName(activity.areaId)}
              </span>
            </dd>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <dt className="sr-only">Sport</dt>
            <dd>
              <Badge variant="secondary">{getSportName(activity.sportId)}</Badge>
            </dd>
            <dt className="sr-only">Preferred skill level</dt>
            <dd>
              <Badge variant="outline">{skillLabel(activity.preferredSkillLevel)}</Badge>
            </dd>
          </div>

          <div className="flex items-center gap-2">
            <dt className="sr-only">Price range</dt>
            <Wallet aria-hidden className="size-4 shrink-0 text-primary" />
            <dd className="text-body text-card-foreground">
              {formatBudget(activity.budget)}
              <span className="text-body-small text-muted-foreground"> / person</span>
            </dd>
          </div>

          <div className="flex items-center gap-2">
            <dt className="sr-only">When</dt>
            <CalendarClock aria-hidden className="size-4 shrink-0 text-primary" />
            <dd className="text-body-small text-muted-foreground">
              {formatActivityDate(activity.startAt)} · {formatActivityTime(activity.startAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-col gap-3">
          {isOrganizer && (
            <>
              {activity.participantIds.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-caption text-muted-foreground uppercase">
                    Joined ({activity.participantIds.length}/{activity.maxParticipants})
                  </span>
                  {activity.participantIds.map((id) => {
                    const name = people.get(id)?.displayName ?? 'Sports buddy'
                    return (
                      <div key={id} className="flex items-center justify-between gap-2">
                        {/* Links to their profile: an organizer deciding who
                            to keep should be able to look them up. */}
                        <Link
                          to={buddyProfilePath(id)}
                          className="flex min-w-0 items-center gap-2 rounded-lg transition-ui hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <Avatar className="size-8 shrink-0">
                            {people.get(id)?.photoUrl && (
                              <AvatarImage src={people.get(id)?.photoUrl ?? undefined} alt="" />
                            )}
                            <AvatarFallback className="text-caption">
                              {getInitials(name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-body text-card-foreground">{name}</span>
                        </Link>
                        {!isPast && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy !== 'idle'}
                            aria-label={`Remove ${name}`}
                            onClick={() =>
                              void run(`remove:${id}`, () => removeParticipant(activity, id))
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {!isPast && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to={editGroupActivityPath(activity.id)}>Edit</Link>
                  </Button>
                  {onRemove && (
                    <Button
                      variant="ghost"
                      className="flex-1"
                      disabled={busy !== 'idle'}
                      onClick={() => void run('remove', () => onRemove(activity.id))}
                    >
                      {busy === 'remove' ? 'Removing…' : 'Remove'}
                    </Button>
                  )}
                </div>
              )}

              {checkInOpen && (
                <Button variant="outline" onClick={() => setIsQrOpen(true)}>
                  <QrCode className="size-4" />
                  Show check-in code
                </Button>
              )}
              {isQrOpen && (
                <CheckInQrDialog
                  kind="group"
                  activityId={activity.id}
                  hostId={activity.organizerId}
                  onClose={() => setIsQrOpen(false)}
                />
              )}
            </>
          )}

          {viewerState === 'joined' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <StatusPill tone={isEnded ? 'neutral' : 'success'} icon={Check}>
                  You&apos;re in
                </StatusPill>
                {!isPast && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy !== 'idle'}
                    onClick={() => void run('leave', () => leave(activity))}
                  >
                    {busy === 'leave' ? 'Leaving…' : 'Leave'}
                  </Button>
                )}
              </div>
              {hasStarted && viewerId && (
                checkedIn ? (
                  <StatusPill tone="success" icon={ShieldCheck}>
                    Checked in
                  </StatusPill>
                ) : checkInOpen ? (
                  <ScanCheckInButton
                    kind="group"
                    activityId={activity.id}
                    userId={viewerId}
                    onCheckedIn={() => setCheckedIn(true)}
                  />
                ) : (
                  <span className="text-caption text-muted-foreground">
                    Check-in closed {CHECK_IN_GRACE_MINUTES} minutes after this session ended.
                  </span>
                )
              )}
            </>
          )}

          {viewerState === 'full' && (
            <Button variant="outline" disabled>
              Full
            </Button>
          )}

          {viewerState === 'can-join' && (
            <Button
              disabled={busy !== 'idle'}
              aria-label={`Join ${activity.title}`}
              onClick={() => void run('join', () => join(activity))}
            >
              {busy === 'join' ? 'Joining…' : 'Join'}
            </Button>
          )}

          {!isPast && <ShareGroupActivityActions activity={activity} />}

          {error && (
            <p role="alert" className="text-body-small text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
