import { ShieldCheck } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useReliability } from '@/features/profile/use-reliability'

/**
 * Evidence, never a claim. "11 Verified Sessions" / "92% Show-up Rate" —
 * never "Never flakes" or any other absolute statement about a person.
 * Basic reliability stats are free for everyone; see `docs/monetization.md`
 * for what stays behind Buddy+ (deeper trend analytics, not this).
 */
export function ReliabilityCard() {
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

  return (
    <Card>
      <CardContent className="flex items-center gap-6">
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
      </CardContent>
    </Card>
  )
}
