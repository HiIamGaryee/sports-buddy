import { getSkillLabel, getSportName } from '@/lib/profile-format'
import { getSport } from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import type { UserSport } from '@/types/sports-profile'

export function SportSkillList({
  sports,
  className,
}: {
  sports: UserSport[]
  className?: string
}) {
  if (sports.length === 0) {
    return (
      <p className="text-body-small text-muted-foreground">
        No sports yet — add one from Edit profile.
      </p>
    )
  }

  return (
    <div className={cn('flex flex-col divide-y divide-border', className)}>
      {sports.map(({ sportId, skillLevel }) => {
        const Icon = getSport(sportId)?.icon
        return (
          <div
            key={sportId}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            {Icon && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-muted-foreground">
                <Icon aria-hidden className="size-4" />
              </span>
            )}
            <span className="flex-1 text-title text-card-foreground">
              {getSportName(sportId)}
            </span>
            <span className="text-label text-primary">
              {getSkillLabel(skillLevel)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
