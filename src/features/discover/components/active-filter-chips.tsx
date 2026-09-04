import { Badge } from '@/components/ui/badge'
import {
  getAreaName,
  getIntentLabel,
  getSkillLabel,
  getSportName,
} from '@/lib/profile-format'
import type { DiscoverFilters } from '@/types/discover'

/** Read-only summary of what is currently narrowing the feed. */
export function ActiveFilterChips({ filters }: { filters: DiscoverFilters }) {
  const chips = [
    ...filters.sports.map((sportId) => getSportName(sportId)),
    ...filters.skillLevels.map((level) => getSkillLabel(level)),
    ...filters.intents.map((intent) => getIntentLabel(intent)),
    ...filters.areas.map((area) => getAreaName(area)),
    ...(filters.requireAvailabilityOverlap ? ['Matching availability'] : []),
  ]

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Badge key={chip} variant="outline">
          {chip}
        </Badge>
      ))}
    </div>
  )
}
