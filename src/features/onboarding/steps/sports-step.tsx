import { SportSelector } from '@/components/profile/sport-selector'
import type { ProfileDraft } from '@/lib/profile-draft'
import type { SportId } from '@/types/sports-profile'

export function SportsStep({
  draft,
  onToggleSport,
}: {
  draft: ProfileDraft
  onToggleSport: (sportId: SportId) => void
}) {
  return (
    <SportSelector
      selected={draft.sports.map((sport) => sport.sportId)}
      onToggle={onToggleSport}
    />
  )
}
