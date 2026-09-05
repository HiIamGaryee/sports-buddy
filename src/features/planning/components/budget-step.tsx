import { useState } from 'react'

import { SelectionChip } from '@/components/profile/selection-chip'
import { Button } from '@/components/ui/button'
import { BUDGET_OPTIONS } from '@/constants/profile-options'
import { formatBudget } from '@/lib/profile-format'
import type { BudgetPreference } from '@/types/sports-profile'

const isSameBudget = (a: BudgetPreference | null, b: BudgetPreference | null) =>
  a !== null && b !== null && a.min === b.min && a.max === b.max

/**
 * The plan's budget is what these two agree for THIS session — related to
 * their profile preferences, but not the same thing. It is per person, and
 * says so, because no venue has been chosen yet.
 *
 * A non-overlapping pair of profile budgets never blocks planning; it just
 * loses the suggestion.
 */
export function BudgetStep({
  suggested,
  proposed,
  buddyName,
  isSaving,
  onPropose,
}: {
  suggested: BudgetPreference | null
  proposed: BudgetPreference | null
  buddyName: string
  isSaving: boolean
  onPropose: (budget: BudgetPreference) => void
}) {
  const [draft, setDraft] = useState<BudgetPreference | null>(
    () => proposed ?? suggested,
  )

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-caption text-muted-foreground uppercase">
          Budget per person
        </h3>

        {suggested ? (
          <p className="text-body text-foreground">
            You and {buddyName} both usually spend around{' '}
            <span className="text-title">{formatBudget(suggested)}</span> per
            activity.
          </p>
        ) : (
          <p className="text-body text-muted-foreground">
            Your usual budgets don't overlap. Pick something that works for
            this session.
          </p>
        )}

        {suggested && (
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => setDraft(suggested)}
            className="sm:w-auto sm:self-start sm:px-6"
          >
            Use {formatBudget(suggested)}
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-caption text-muted-foreground uppercase">
          This session
        </h3>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Budget per person"
        >
          {BUDGET_OPTIONS.map(({ id, label, budget }) => (
            <SelectionChip
              key={id}
              label={label}
              selected={isSameBudget(draft, budget)}
              onClick={() => setDraft(budget)}
            />
          ))}
        </div>

        <Button
          disabled={isSaving || draft === null}
          onClick={() => draft && onPropose(draft)}
          className="sm:w-auto sm:self-start sm:px-8"
        >
          {isSaving
            ? 'Saving…'
            : draft
              ? `Suggest ${formatBudget(draft)} each`
              : 'Suggest a budget'}
        </Button>
      </section>
    </div>
  )
}
