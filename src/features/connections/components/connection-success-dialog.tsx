import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useConnections } from '@/hooks/use-connections'
import { useProfile } from '@/hooks/use-profile'
import { getSportName } from '@/lib/profile-format'
import { buddyProfilePath } from '@/routes/routes'
import { discoverService } from '@/services/discover/discover-service'
import {
  calculateCompatibility,
  toMatchingSubject,
} from '@/services/matching/matching-service'

interface BuddyState {
  userId: string
  displayName: string
  sharedSport: string | null
}

/**
 * Mounted once for the signed-in app. It reacts to a TRANSITION — a
 * relationship that became mutual while the app was open — so refreshing an
 * already-connected pair never reopens it.
 *
 * Deliberately not a dating "match" moment: no confetti, no hearts, no
 * full-screen effect. One restrained icon, the two names, and the sport the
 * two of them actually share.
 */
export function ConnectionSuccessDialog() {
  const { justConnectedUserId, clearJustConnected } = useConnections()
  const { profile } = useProfile()
  const [buddy, setBuddy] = useState<BuddyState | null>(null)

  useEffect(() => {
    if (!justConnectedUserId || !profile) return

    let active = true
    // One read, only on the event itself.
    discoverService
      .getCandidate(justConnectedUserId)
      .then((candidate) => {
        if (!active || !candidate) return
        const { bestSportMatch } = calculateCompatibility(
          toMatchingSubject(profile),
          candidate,
        )
        setBuddy({
          userId: candidate.userId,
          displayName: candidate.displayName,
          sharedSport: bestSportMatch ? getSportName(bestSportMatch) : null,
        })
      })
      .catch(() => {
        // A missing projection is not worth an error state here.
      })

    return () => {
      active = false
    }
  }, [justConnectedUserId, profile])

  const close = () => {
    clearJustConnected()
    setBuddy(null)
  }

  const isOpen = justConnectedUserId !== null && buddy !== null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent showCloseButton={false} className="gap-5 p-5">
        {buddy && (
          <>
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-16 animate-in items-center justify-center rounded-full bg-primary/15 duration-300 ease-out zoom-in-75">
                <UserCheck className="size-8 text-primary" />
              </span>
              <div className="flex flex-col gap-1.5">
                <DialogTitle className="text-heading-2 text-popover-foreground">
                  You found a sports buddy.
                </DialogTitle>
                <DialogDescription className="text-body text-muted-foreground">
                  You and {buddy.displayName} both want to connect.
                </DialogDescription>
              </div>
              {buddy.sharedSport && (
                <span className="rounded-full bg-muted px-3 py-1.5 text-label text-foreground">
                  You both play {buddy.sharedSport}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={close}>
                Done
              </Button>
              <Button asChild className="flex-1" onClick={close}>
                <Link to={buddyProfilePath(buddy.userId)}>View profile</Link>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
