import { SelectableCard } from '@/components/profile/selectable-card'
import { EmptyState } from '@/components/common/empty-state'
import { Dumbbell } from 'lucide-react'

import { getSport, getSkillLabel } from '@/lib/profile-format'
import type { SharedSportOption } from '@/types/planning'
import type { SportId } from '@/types/sports-profile'

/**
 * Only sports BOTH people listed. Proposing something the other person does
 * not play is not a plan, so the list is the intersection and nothing else.
 * Each card shows both skill levels, which is the reason it is a good choice.
 */
export function SportStep({
  options,
  selectedSportId,
  buddyName,
  isSaving,
  onPropose,
}: {
  options: readonly SharedSportOption[]
  selectedSportId: SportId | null
  buddyName: string
  isSaving: boolean
  onPropose: (sportId: SportId) => void
}) {
  if (options.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="No shared sports available."
        description={`You and ${buddyName} don't list a sport in common yet. Add one to your profile and this step will fill in.`}
        className="w-full"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map(({ sportId, mySkillLevel, theirSkillLevel }) => (
        <SelectableCard
          key={sportId}
          icon={getSport(sportId)?.icon}
          title={getSport(sportId)?.name ?? sportId}
          description={`You ${getSkillLabel(mySkillLevel)} · ${buddyName} ${getSkillLabel(theirSkillLevel)}`}
          selected={sportId === selectedSportId}
          disabled={isSaving}
          onClick={() => onPropose(sportId)}
        />
      ))}
    </div>
  )
}
