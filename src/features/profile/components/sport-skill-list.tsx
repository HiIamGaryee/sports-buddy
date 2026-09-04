import { getSkillLabel, getSportName } from '@/lib/profile-format'
import { getSport } from '@/lib/profile-format'
import type { UserSport } from '@/types/sports-profile'

export function SportSkillList({ sports }: { sports: UserSport[] }) {
  if (sports.length === 0) {
    return (
      <p className="text-body-small text-muted-foreground">
        No sports yet — add one from Edit profile.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sports.map(({ sportId, skillLevel }) => {
        const Icon = getSport(sportId)?.icon
        return (
          <div
            key={sportId}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3"
          >
            {Icon && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
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
