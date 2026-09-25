import { Sparkles } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { APP_NAME } from '@/constants/app'
import { getSportName } from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import type { MonthlyRecap } from '@/types/recap'

/**
 * The recap, on screen. Also what the shareable image (`src/lib/recap-image.ts`)
 * mirrors — kept visually in sync by hand since drawing a real DOM node to an
 * image needs a library this project does not have; both read the exact same
 * `MonthlyRecap` + `memberName` so their CONTENT can never drift, only pixel
 * styling could.
 */
export function RecapCard({
  recap,
  memberName,
  buddyNames,
  className,
}: {
  recap: MonthlyRecap
  memberName: string
  /**
   * `userId → display name` for the people in `recap.buddies`. The recap
   * itself stores ids only, so names are resolved by the caller from
   * `publicProfiles`, like every other surface.
   */
  buddyNames?: ReadonlyMap<string, string>
  className?: string
}) {
  const hasSessions = recap.totalSessions > 0

  return (
    <Card variant="elevated" className={cn('overflow-hidden', className)}>
      <div className="h-2 w-full bg-primary-gradient" aria-hidden />
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-caption text-muted-foreground uppercase">
            <Sparkles aria-hidden className="size-3.5 text-primary" />
            {APP_NAME}
          </span>
          <span className="text-caption text-muted-foreground uppercase">Monthly recap</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-heading-2 text-card-foreground">{memberName}&apos;s</span>
          <span className="text-heading-1 text-primary-gradient">{recap.monthLabel}</span>
        </div>

        {hasSessions ? (
          <ul className="flex flex-col gap-2">
            {recap.sports.map((entry) => (
              <li key={entry.sportId} className="flex items-center justify-between gap-3">
                <span className="text-title text-card-foreground">{getSportName(entry.sportId)}</span>
                <span className="text-title text-muted-foreground">×{entry.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">
            No sessions yet this month — go play something.
          </p>
        )}

        {hasSessions && recap.buddies.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-5">
            <span className="text-caption text-muted-foreground uppercase">Played with</span>
            <ul className="flex flex-col gap-1.5">
              {recap.buddies.slice(0, 4).map((buddy) => (
                <li key={buddy.userId} className="flex items-center justify-between gap-3">
                  <span className="truncate text-body text-card-foreground">
                    {buddyNames?.get(buddy.userId) ?? 'Sports buddy'}
                  </span>
                  <span className="shrink-0 text-body text-muted-foreground">
                    {buddy.count}×
                  </span>
                </li>
              ))}
            </ul>
            {recap.buddies.length > 4 && (
              <span className="text-caption text-muted-foreground">
                and {recap.buddies.length - 4} more
              </span>
            )}
          </div>
        )}

        {hasSessions && (
          <div className="flex items-center gap-8 border-t border-border pt-5">
            <div className="flex flex-col">
              <span className="text-metric text-foreground">{recap.verifiedSessions}</span>
              <span className="text-caption text-muted-foreground uppercase">Verified sessions</span>
            </div>
            <div className="flex flex-col">
              <span className="text-metric text-foreground">
                {recap.showUpRatePercent === null ? '—' : `${recap.showUpRatePercent}%`}
              </span>
              <span className="text-caption text-muted-foreground uppercase">Show-up rate</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
