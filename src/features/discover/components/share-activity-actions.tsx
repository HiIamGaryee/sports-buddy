import { useEffect, useMemo, useState } from 'react'
import { Check, Send, Share2 } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/use-auth'
import { useConnections } from '@/hooks/use-connections'
import { useSafety } from '@/hooks/use-safety'
import { getInitials } from '@/lib/initials'
import { describeActivityForSharing } from '@/lib/share'
import { getSportName } from '@/lib/profile-format'
import { chatService } from '@/services/chat/chat-service'
import { discoverService } from '@/services/discover/discover-service'
import { shareService } from '@/services/share/share-service'
import type { ActivityPost } from '@/types/activity-post'

interface BuddyRow {
  userId: string
  displayName: string
  photoUrl: string | null
}

/**
 * Share an activity two ways: OUTSIDE the app through the device share sheet
 * (or a copied link), and INSIDE it by sending the link to a connected buddy
 * as a chat message. The link opens `/activity/:postId`, which also works for
 * someone who has no account yet.
 */
export function ShareActivityActions({ post }: { post: ActivityPost }) {
  const [feedback, setFeedback] = useState('')
  const [isSendOpen, setIsSendOpen] = useState(false)

  const share = async () => {
    setFeedback('')
    try {
      const outcome = await shareService.share({
        url: shareService.activityUrl(post.id),
        title: `${getSportName(post.sportId)} on Sports Buddy`,
        text: describeActivityForSharing(post),
      })
      if (outcome === 'copied') setFeedback('Link copied.')
    } catch (shareError) {
      setFeedback(
        shareError instanceof Error
          ? shareError.message
          : "We couldn't share this link. Please try again.",
      )
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => void share()}>
          <Share2 className="size-4" />
          Share link
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setIsSendOpen(true)}
        >
          <Send className="size-4" />
          Send to a buddy
        </Button>
      </div>
      {feedback && (
        <p role="status" className="text-body-small text-muted-foreground">
          {feedback}
        </p>
      )}
      {isSendOpen && (
        <SendToBuddyDialog post={post} onClose={() => setIsSendOpen(false)} />
      )}
    </div>
  )
}

/**
 * Connected, unblocked buddies — the only people a message can reach — with
 * one batched `publicProfiles` read for their names when the dialog opens.
 */
function SendToBuddyDialog({
  post,
  onClose,
}: {
  post: ActivityPost
  onClose: () => void
}) {
  const { user } = useAuth()
  const { connections } = useConnections()
  const { blockedIds } = useSafety()
  const [loaded, setLoaded] = useState<{ key: string; rows: BuddyRow[] } | null>(null)
  const [sentTo, setSentTo] = useState<ReadonlySet<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const buddyIds = useMemo(
    () =>
      [...connections.entries()]
        .filter(
          ([otherId, connection]) =>
            connection.status === 'connected' &&
            !blockedIds.has(otherId) &&
            otherId !== post.authorId,
        )
        .map(([otherId]) => otherId),
    [connections, blockedIds, post.authorId],
  )
  const idsKey = buddyIds.join(',')

  useEffect(() => {
    if (!idsKey) return
    let active = true
    const ids = idsKey.split(',')
    discoverService
      .getProfiles(ids)
      .catch(() => [])
      .then((found) => {
        if (!active) return
        const byId = new Map(found.map((profile) => [profile.userId, profile]))
        setLoaded({
          key: idsKey,
          // Someone whose profile is hidden still gets a row, just unnamed.
          rows: ids.map((id) => ({
            userId: id,
            displayName: byId.get(id)?.displayName ?? 'Sports buddy',
            photoUrl: byId.get(id)?.photoUrl ?? null,
          })),
        })
      })
    return () => {
      active = false
    }
  }, [idsKey])

  const profiles = !idsKey ? [] : loaded?.key === idsKey ? loaded.rows : null

  const send = async (buddyId: string) => {
    if (!user || busyId) return
    setBusyId(buddyId)
    setError('')
    try {
      await chatService.sendFromElsewhere(
        connections.get(buddyId),
        user.id,
        `${describeActivityForSharing(post)} ${shareService.activityUrl(post.id)}`,
      )
      setSentTo((current) => new Set(current).add(buddyId))
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Message wasn't sent. Try again.",
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to a buddy</DialogTitle>
          <DialogDescription>
            They get the link in your chat and can open it from there.
          </DialogDescription>
        </DialogHeader>

        {profiles === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-body-small text-muted-foreground">
            Connect with someone first — then you can send them activities.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {profiles.map((profile) => {
              const isSent = sentTo.has(profile.userId)
              return (
                <li key={profile.userId} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-9 shrink-0">
                      {profile.photoUrl && <AvatarImage src={profile.photoUrl} alt="" />}
                      <AvatarFallback className="text-caption">
                        {getInitials(profile.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-body text-foreground">
                      {profile.displayName}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant={isSent ? 'outline' : 'default'}
                    disabled={isSent || busyId !== null}
                    aria-label={`Send to ${profile.displayName}`}
                    onClick={() => void send(profile.userId)}
                  >
                    {isSent ? (
                      <>
                        <Check className="size-4" />
                        Sent
                      </>
                    ) : busyId === profile.userId ? (
                      'Sending…'
                    ) : (
                      'Send'
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}

        {error && (
          <p role="alert" className="text-body-small text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
