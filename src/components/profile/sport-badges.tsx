import { Badge } from '@/components/ui/badge'
import { getSportName } from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import type { SportId } from '@/types/sports-profile'

import styles from './sport-badges.module.css'

/** How many sports a card shows before "+n"; the rest are on the profile. */
export const MAX_SPORTS_ON_CARD = 3

/**
 * A member's API-ordered sports, with activities that match the viewer's
 * saved preferences set apart. Everything else keeps the neutral chip.
 */
export function SportBadges({
  sports,
  matchingSports = [],
  max = MAX_SPORTS_ON_CARD,
  className,
}: {
  sports: readonly SportId[]
  /** Candidate sports that also match the viewer's activity preferences. */
  matchingSports?: readonly SportId[]
  max?: number
  className?: string
}) {
  if (sports.length === 0) return null

  const shown = sports.slice(0, max)
  const hidden = sports.length - shown.length

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {shown.map((sportId) => {
        const isMatch = matchingSports.includes(sportId)
        return (
          <Badge
            key={sportId}
            variant={isMatch ? 'outline' : 'secondary'}
            className={isMatch ? styles['activity-pill--match'] : undefined}
          >
            <span>{getSportName(sportId)}</span>
          </Badge>
        )
      })}
      {hidden > 0 && (
        <span className="text-caption text-muted-foreground">+{hidden} more</span>
      )}
    </div>
  )
}
