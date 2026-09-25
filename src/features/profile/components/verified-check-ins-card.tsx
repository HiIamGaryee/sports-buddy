import { ShieldCheck } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useReliability } from '@/features/profile/use-reliability'

/**
 * QR CHECK-IN evidence: sessions this member verified by scanning (or typing)
 * the host's code, and what that is out of.
 *
 * Distinct from `features/ratings/ReliabilityCard`, which is what OTHER people
 * said about them. This one is a machine-recorded fact, not an opinion, and it
 * is evidence rather than a claim: never "never flakes", and a session with no
 * check-in is reported as exactly that.
 */
export function VerifiedCheckInsCard() {
  const { stats, isLoading, error } = useReliability()

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  // A quiet, non-blocking failure: reliability is supplementary, not core
  // profile data, so it never puts an ErrorState in the middle of Profile.
  if (error || !stats) return null

  if (stats.verifiedSessions === 0) {
    return (
      <Card variant="subtle">
        <CardContent className="flex items-center gap-3">
          <ShieldCheck aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          <p className="text-body-small text-muted-foreground">
            Check in at a group activity to start building your Reliability Profile.
          </p>
        </CardContent>
      </Card>
    )
  }

  const missing = Math.max(0, stats.eligibleSessions - stats.verifiedSessions)

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col">
            <span className="text-metric text-foreground">{stats.verifiedSessions}</span>
            <span className="text-caption text-muted-foreground uppercase">Verified sessions</span>
          </div>
          {stats.showUpRatePercent !== null && (
            <div className="flex flex-col">
              <span className="text-metric text-foreground">{stats.showUpRatePercent}%</span>
              <span className="text-caption text-muted-foreground uppercase">Show-up rate</span>
            </div>
          )}
        </div>

        {/*
          The receipt: what the numbers are OUT OF, so "I did not flake" is
          something a member can actually see. A missing check-in is stated as
          exactly that — nobody is called a no-show for forgetting to scan.
        */}
        <p className="flex items-start gap-2 text-body-small text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            You checked in to {stats.verifiedSessions} of your{' '}
            {stats.eligibleSessions} started {stats.eligibleSessions === 1 ? 'session' : 'sessions'}
            {missing === 0
              ? ' — every one of them.'
              : `. ${missing} ${missing === 1 ? 'has' : 'have'} no check-in recorded, which can simply mean nobody scanned the code.`}
          </span>
        </p>
      </CardContent>
    </Card>
  )
}
