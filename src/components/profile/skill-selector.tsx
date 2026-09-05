import { ChoiceChip } from '@/components/ui/choice-chip'
import { SKILL_LEVELS } from '@/constants/profile-options'
import { getSportName } from '@/lib/profile-format'
import type { SkillLevel, SportId } from '@/types/sports-profile'

/** One skill level per sport — never a single global level. */
export function SkillSelector({
  sports,
  onChange,
}: {
  sports: readonly { sportId: SportId; skillLevel: SkillLevel | null }[]
  onChange: (sportId: SportId, skillLevel: SkillLevel) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {sports.map(({ sportId, skillLevel }) => (
        <div
          key={sportId}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-title text-card-foreground">
              {getSportName(sportId)}
            </span>
            {skillLevel === null && (
              <span className="text-caption text-warning uppercase">
                Not set
              </span>
            )}
          </div>
          <div
            role="radiogroup"
            aria-label={`${getSportName(sportId)} skill level`}
            className="grid grid-cols-2 gap-2"
          >
            {SKILL_LEVELS.map((level) => (
              <ChoiceChip
                key={level.id}
                label={level.label}
                selection="single"
                selected={skillLevel === level.id}
                onClick={() => onChange(sportId, level.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
