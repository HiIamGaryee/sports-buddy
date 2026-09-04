import { SelectionChip } from '@/components/profile/selection-chip'
import { BUDGET_OPTIONS } from '@/constants/profile-options'
import type { BudgetPreference } from '@/types/sports-profile'

const isSameBudget = (a: BudgetPreference | null, b: BudgetPreference) =>
  a !== null && a.min === b.min && a.max === b.max

export function BudgetSelector({
  value,
  onChange,
}: {
  value: BudgetPreference | null
  onChange: (budget: BudgetPreference) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Usual budget"
      className="grid grid-cols-2 gap-2"
    >
      {BUDGET_OPTIONS.map(({ id, label, budget }) => (
        <SelectionChip
          key={id}
          label={label}
          single
          selected={isSameBudget(value, budget)}
          onClick={() => onChange(budget)}
        />
      ))}
    </div>
  )
}
