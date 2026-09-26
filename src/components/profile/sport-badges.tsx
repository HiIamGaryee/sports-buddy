import { Heart } from 'lucide-react'
import { useState } from 'react'

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
  const [isExpanded, setIsExpanded] = useState(false)
  if (sports.length === 0) return null

  const shown = isExpanded ? sports : sports.slice(0, max)
  const hidden = sports.length - Math.min(sports.length, max)

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
            {isMatch && (
              <Heart data-icon="inline-start" aria-hidden className="fill-current" />
            )}
            <span>
              {isMatch && <span className="sr-only">You like this too: </span>}
              {getSportName(sportId)}
            </span>
          </Badge>
        )
      })}
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          // The label is caption-sized; the invisible ::after gives it a
          // 44px touch target without making the row any taller.
          className="relative rounded-md text-caption text-muted-foreground transition-ui after:absolute after:-inset-3 after:content-[''] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {isExpanded ? 'Show less' : `+${hidden} more`}
        </button>
      )}
    </div>
  )
}
