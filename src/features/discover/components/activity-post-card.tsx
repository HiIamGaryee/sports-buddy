import { useState } from 'react'
import { CalendarClock, Check, MapPin, UserCheck, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { ConnectAction } from '@/features/connections/components/connect-action'
import { ShareActivityActions } from '@/features/discover/components/share-activity-actions'
import { usePostActions } from '@/features/discover/use-post-actions'
import { useConnections } from '@/hooks/use-connections'
import { formatActivityDate, formatActivityTime } from '@/lib/activity-format'
import { getPostViewerState, isPostFull } from '@/lib/activity-post'
import { getInitials } from '@/lib/initials'
import {
  formatBudget,
  getAreaName,
  getIntensityLabel,
  getIntentLabel,
  getSportName,
} from '@/lib/profile-format'
import { editActivityPostPath } from '@/routes/routes'
import type { ActivityPost } from '@/types/activity-post'
import type { DiscoveryProfile } from '@/types/discovery-profile'

type Busy = 'idle' | 'join' | 'leave' | 'remove' | `approve:${string}` | `decline:${string}`

const VISIBILITY_BADGE = {
  public: null,
  link: 'Link only',
  invite: 'Private invite',
} as const

function Person({ profile }: { profile?: DiscoveryProfile }) {
  const name = profile?.displayName ?? 'Sports buddy'
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-8 shrink-0">
        {profile?.photoUrl && <AvatarImage src={profile.photoUrl} alt="" />}
        <AvatarFallback className="text-caption">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate text-body text-card-foreground">
        {name}
      </span>
    </span>
  )
}

/**
 * One activity, read top to bottom: WHO is playing (how they like to play,
 * what they are looking for), WHERE, WHAT sport, HOW MUCH per person, WHEN —
 * then the action for THIS viewer, derived by `getPostViewerState`.
 *
 * The author instead sees who asked and who is in, with Approve / Decline /
 * Remove, plus Edit and Remove for the post. A private invite shows its
 * invitee an Accept button and nobody else anything at all. Public and
 * link-only posts can be shared until they start. Labels come from the shared
 * formatters, so a sport or area reads the same everywhere.
 */
export function ActivityPostCard({
  post,
  people,
  now,
  onChanged,
  onRemove,
}: {
  post: ActivityPost
  /** Public profiles for the author, the joiner and anyone waiting. */
  people: ReadonlyMap<string, DiscoveryProfile>
  now: Date
  /** Reload whatever list this card sits in, after any change. */
  onChanged: () => void
  onRemove?: (postId: string) => Promise<void>
}) {
  const { viewerId, join, leave, approve, decline } = usePostActions(onChanged)
  const { getConnectionState } = useConnections()
  const [busy, setBusy] = useState<Busy>('idle')
  const [error, setError] = useState('')

  const viewerState = viewerId ? getPostViewerState(post, viewerId, now) : 'past'
  const isAuthor = viewerState === 'author'
  const author = people.get(post.authorId)
  const authorName = author?.displayName ?? 'Sports buddy'
  const playingStyle = author?.preferredIntensity
    ? getIntensityLabel(author.preferredIntensity)
    : null
  const full = isPostFull(post)
  const isPast = new Date(post.startAt).getTime() <= now.getTime()
  const visibilityBadge = VISIBILITY_BADGE[post.visibility]
  const isInvite = post.visibility === 'invite'
  const canShare = !isInvite && !isPast && viewerState !== 'past'

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

  return (
    <article className="opportunity-card group/card h-full">
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-11 shrink-0">
            {author?.photoUrl && <AvatarImage src={author.photoUrl} alt="" />}
            <AvatarFallback className="text-title">
              {getInitials(author?.displayName ?? (isAuthor ? 'You' : authorName))}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-heading-3 text-card-foreground">
              {isAuthor ? 'You' : authorName}
            </span>
            {isAuthor ? (
              <span className="text-caption text-muted-foreground uppercase">
                Your activity{post.updatedAt ? ' · edited' : ''}
              </span>
            ) : (
              playingStyle && (
                <span className="text-body-small text-muted-foreground">
                  Plays {playingStyle.toLowerCase()}
                </span>
              )
            )}
          </div>
          <StatusPill tone={full ? 'neutral' : 'success'} icon={full ? Check : Users}>
            {full ? 'Full' : '1 spot'}
          </StatusPill>
        </div>

        {!isAuthor && author && author.intents.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-caption text-muted-foreground uppercase">
              Looking for
            </span>
            <div className="flex flex-wrap gap-2">
              {author.intents.map((intent) => (
                <Badge key={intent} variant="outline">
                  {getIntentLabel(intent)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <dl className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <dt className="sr-only">Location</dt>
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <dd className="min-w-0 text-body text-card-foreground">
              <span className="block truncate">{post.venueName}</span>
              <span className="block text-body-small text-muted-foreground">
                {getAreaName(post.areaId)}
              </span>
            </dd>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <dt className="sr-only">Sport</dt>
            <dd>
              <Badge variant="secondary">{getSportName(post.sportId)}</Badge>
            </dd>
            <dt className="sr-only">Who can join</dt>
            {!isInvite && (
              <dd>
                <Badge variant="outline">
                  {post.joinPolicy === 'approval' ? 'Approval needed' : 'Anyone can join'}
                </Badge>
              </dd>
            )}
            {visibilityBadge && (
              <>
                <dt className="sr-only">Who can see it</dt>
                <dd>
                  <Badge variant="outline">{visibilityBadge}</Badge>
                </dd>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <dt className="sr-only">Price range</dt>
            <Wallet aria-hidden className="size-4 shrink-0 text-primary" />
            <dd className="text-body text-card-foreground">
              {formatBudget(post.budget)}
              <span className="text-body-small text-muted-foreground"> / person</span>
            </dd>
          </div>

          <div className="flex items-center gap-2">
            <dt className="sr-only">When</dt>
            <CalendarClock aria-hidden className="size-4 shrink-0 text-primary" />
            <dd className="text-body-small text-muted-foreground">
              {formatActivityDate(post.startAt)} · {formatActivityTime(post.startAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-col gap-3">
          {isAuthor && (
            <>
              {isInvite && post.invitedId && post.joinedIds.length === 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-caption text-muted-foreground uppercase">
                    {isPast ? 'Invited' : 'Waiting for them to accept'}
                  </span>
                  <Person profile={people.get(post.invitedId)} />
                </div>
              )}

              {post.pendingIds.length > 0 && !isPast && (
                <div className="flex flex-col gap-2">
                  <span className="text-caption text-muted-foreground uppercase">
                    Wants to join
                  </span>
                  {post.pendingIds.map((id) => {
                    const name = people.get(id)?.displayName ?? 'Sports buddy'
                    return (
                      <div key={id} className="flex items-center justify-between gap-2">
                        <Person profile={people.get(id)} />
                        <div className="flex shrink-0 gap-1">
                          <Button
                            size="sm"
                            disabled={busy !== 'idle' || full}
                            aria-label={`Approve ${name}`}
                            onClick={() => void run(`approve:${id}`, () => approve(post, id))}
                          >
                            {busy === `approve:${id}` ? 'Approving…' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy !== 'idle'}
                            aria-label={`Decline ${name}`}
                            onClick={() => void run(`decline:${id}`, () => decline(post, id))}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {post.joinedIds.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-caption text-muted-foreground uppercase">
                    Joined
                  </span>
                  {post.joinedIds.map((id) => {
                    const name = people.get(id)?.displayName ?? 'Sports buddy'
                    return (
                      <div key={id} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <Person profile={people.get(id)} />
                          {!isPast && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy !== 'idle'}
                              aria-label={`Remove ${name} from this activity`}
                              onClick={() => void run(`decline:${id}`, () => decline(post, id))}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <ConnectAction
                          userId={id}
                          displayName={name}
                          state={getConnectionState(id)}
                          size="default"
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              {!isPast && (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link to={editActivityPostPath(post.id)}>Edit</Link>
                  </Button>
                  {onRemove && (
                    <Button
                      variant="ghost"
                      className="flex-1"
                      disabled={busy !== 'idle'}
                      onClick={() => void run('remove', () => onRemove(post.id))}
                    >
                      {busy === 'remove' ? 'Removing…' : 'Remove'}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {viewerState === 'joined' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <StatusPill tone="success" icon={UserCheck}>
                  You&apos;re in
                </StatusPill>
                {!isPast && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy !== 'idle'}
                    onClick={() => void run('leave', () => leave(post))}
                  >
                    {busy === 'leave' ? 'Leaving…' : 'Leave'}
                  </Button>
                )}
              </div>
              <ConnectAction
                userId={post.authorId}
                displayName={authorName}
                state={getConnectionState(post.authorId)}
              />
            </>
          )}

          {viewerState === 'requested' && (
            <div className="flex flex-col gap-1.5">
              <Button variant="outline" disabled>
                Request sent
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy !== 'idle'}
                aria-label={`Cancel your request to join ${authorName}'s activity`}
                onClick={() => void run('leave', () => leave(post))}
              >
                {busy === 'leave' ? 'Cancelling…' : 'Cancel request'}
              </Button>
            </div>
          )}

          {viewerState === 'invited' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-body-small text-muted-foreground">
                {authorName} invited you to play.
              </span>
              <Button
                disabled={busy !== 'idle'}
                aria-label={`Accept ${authorName}'s invite`}
                onClick={() => void run('join', () => join(post))}
              >
                {busy === 'join' ? 'Accepting…' : 'Accept invite'}
              </Button>
            </div>
          )}

          {viewerState === 'full' && (
            <Button variant="outline" disabled>
              Full
            </Button>
          )}

          {(viewerState === 'can-join' || viewerState === 'can-request') && (
            <Button
              disabled={busy !== 'idle'}
              aria-label={`${viewerState === 'can-join' ? 'Join' : 'Request to join'} ${authorName}'s activity`}
              onClick={() => void run('join', () => join(post))}
            >
              {busy === 'join'
                ? viewerState === 'can-join'
                  ? 'Joining…'
                  : 'Sending…'
                : viewerState === 'can-join'
                  ? 'Join'
                  : 'Request to join'}
            </Button>
          )}

          {canShare && <ShareActivityActions post={post} />}

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
