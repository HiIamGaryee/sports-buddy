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
import { describeGroupActivityForSharing } from '@/lib/share'
import { chatService } from '@/services/chat/chat-service'
import { discoverService } from '@/services/discover/discover-service'
import { shareService } from '@/services/share/share-service'
import type { GroupActivity } from '@/types/group-activity'

interface BuddyRow {
  userId: string
  displayName: string
  photoUrl: string | null
}

/**
 * Share a group activity two ways: OUTSIDE the app through the device share
 * sheet (or a copied link), and INSIDE it by sending the link to a connected
 * buddy as a chat message. The link opens `/group-activity/:activityId`,
 * which also works for someone who has no account yet.
 */
export function ShareGroupActivityActions({ activity }: { activity: GroupActivity }) {
  const [feedback, setFeedback] = useState('')
  const [isSendOpen, setIsSendOpen] = useState(false)

  const share = async () => {
    setFeedback('')
    try {
      const outcome = await shareService.share({
        url: shareService.groupActivityUrl(activity.id),
        title: `${activity.title} on Sports Buddy`,
        text: describeGroupActivityForSharing(activity),
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
        <SendToBuddyDialog activity={activity} onClose={() => setIsSendOpen(false)} />
      )}
    </div>
  )
}

function SendToBuddyDialog({
  activity,
  onClose,
}: {
  activity: GroupActivity
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
          ([otherId, connection]) => connection.status === 'connected' && !blockedIds.has(otherId),
        )
        .map(([otherId]) => otherId),
    [connections, blockedIds],
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

  const rows = !idsKey ? [] : loaded?.key === idsKey ? loaded.rows : null

  const send = async (buddyId: string) => {
    if (!user || busyId) return
    setBusyId(buddyId)
    setError('')
    try {
      await chatService.sendFromElsewhere(
        connections.get(buddyId),
        user.id,
        `${describeGroupActivityForSharing(activity)} ${shareService.groupActivityUrl(activity.id)}`,
      )
      setSentTo((current) => new Set(current).add(buddyId))
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Message wasn't sent. Try again.",
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

        {rows === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-body-small text-muted-foreground">
            Connect with someone first — then you can send them activities.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {rows.map((row) => {
              const isSent = sentTo.has(row.userId)
              return (
                <li key={row.userId} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-9 shrink-0">
                      {row.photoUrl && <AvatarImage src={row.photoUrl} alt="" />}
                      <AvatarFallback className="text-caption">
                        {getInitials(row.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-body text-foreground">{row.displayName}</span>
                  </span>
                  <Button
                    size="sm"
                    variant={isSent ? 'outline' : 'default'}
                    disabled={isSent || busyId !== null}
                    aria-label={`Send to ${row.displayName}`}
                    onClick={() => void send(row.userId)}
                  >
                    {isSent ? (
                      <>
                        <Check className="size-4" />
                        Sent
                      </>
                    ) : busyId === row.userId ? (
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

