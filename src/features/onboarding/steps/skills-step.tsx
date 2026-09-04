import { SkillSelector } from '@/components/profile/skill-selector'
import type { ProfileDraft } from '@/lib/profile-draft'
import type { SkillLevel, SportId } from '@/types/sports-profile'

export function SkillsStep({
  draft,
  onSetSkill,
}: {
  draft: ProfileDraft
  onSetSkill: (sportId: SportId, skillLevel: SkillLevel) => void
}) {
  return <SkillSelector sports={draft.sports} onChange={onSetSkill} />
}
