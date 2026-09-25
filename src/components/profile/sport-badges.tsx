import { Badge } from '@/components/ui/badge'
import { getSportName } from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import type { SportId } from '@/types/sports-profile'

/** How many sports a card shows before "+n"; the rest are on the profile. */
export const MAX_SPORTS_ON_CARD = 3

/**
 * A member's sports, with the ones YOU also play set apart.
 *
 * A shared sport is the reason to care about this person, so it is tinted with
 * the primary colour; everything else keeps the neutral chip. Both use the
 * theme's own tokens — the tint is the single `/12` value the design system
 * allows, never a hand-picked shade.
 */
export function SportBadges({
  sports,
  sharedSports = [],
  max = MAX_SPORTS_ON_CARD,
  className,
}: {
  sports: readonly SportId[]
  /** Sports the VIEWER also plays, from the compatibility result. */
  sharedSports?: readonly SportId[]
  max?: number
  className?: string
}) {
  if (sports.length === 0) return null

  // Shared sports lead: if only three fit, they should be the useful three.
  const ordered = [
    ...sports.filter((sportId) => sharedSports.includes(sportId)),
    ...sports.filter((sportId) => !sharedSports.includes(sportId)),
  ]
  const shown = ordered.slice(0, max)
  const hidden = ordered.length - shown.length

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {shown.map((sportId) => {
        const isShared = sharedSports.includes(sportId)
        return (
          <Badge
            key={sportId}
            variant={isShared ? 'outline' : 'secondary'}
            className={isShared ? 'border-primary/30 bg-primary/12 text-primary' : undefined}
          >
            {getSportName(sportId)}
          </Badge>
        )
      })}
      {hidden > 0 && (
        <span className="text-caption text-muted-foreground">+{hidden} more</span>
      )}
    </div>
  )
}
