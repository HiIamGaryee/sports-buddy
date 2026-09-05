import type { BudgetPreference } from '@/types/sports-profile'

/**
 * THE budget overlap calculation. The compatibility engine scores it and the
 * planner suggests a session budget from it — one formula, not two that can
 * drift apart.
 */

/** `null` max means open ended (RM60+), so arithmetic uses Infinity. */
export const budgetUpperBound = (budget: BudgetPreference) =>
  budget.max ?? Infinity

/**
 * The raw intersection of two ranges. `to` may be `Infinity` (both open
 * ended) and may be **less than** `from`, which is what "no overlap, this
 * big a gap" looks like — callers decide what that means to them.
 * `null` only when a budget is missing entirely.
 */
export interface BudgetRangeOverlap {
  from: number
  to: number
}

export function getBudgetRangeOverlap(
  a: BudgetPreference | null | undefined,
  b: BudgetPreference | null | undefined,
): BudgetRangeOverlap | null {
  if (!a || !b) return null
  return {
    from: Math.max(a.min, b.min),
    to: Math.min(budgetUpperBound(a), budgetUpperBound(b)),
  }
}

/** The shared range as a budget, or `null` when the two do not actually meet. */
export function getSharedBudget(
  a: BudgetPreference | null | undefined,
  b: BudgetPreference | null | undefined,
): BudgetPreference | null {
  const overlap = getBudgetRangeOverlap(a, b)
  if (!overlap || overlap.to < overlap.from) return null
  return {
    min: overlap.from,
    max: Number.isFinite(overlap.to) ? overlap.to : null,
  }
}
