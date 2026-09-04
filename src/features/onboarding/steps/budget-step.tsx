import { BioField } from '@/components/profile/bio-field'
import { BudgetSelector } from '@/components/profile/budget-selector'
import type { ProfileDraft } from '@/lib/profile-draft'
import type { BudgetPreference } from '@/types/sports-profile'

export function BudgetStep({
  draft,
  onSetBudget,
  onSetBio,
}: {
  draft: ProfileDraft
  onSetBudget: (budget: BudgetPreference) => void
  onSetBio: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-label text-foreground">
          Typical spend for one activity
        </h2>
        <BudgetSelector value={draft.budget} onChange={onSetBudget} />
      </section>
      <BioField
        id="onboarding-bio"
        value={draft.bio}
        onChange={onSetBio}
      />
    </div>
  )
}
