import type { AvailabilitySlot } from '@/types/sports-profile'

/**
 * Pure availability overlap: do two people share at least one day+period?
 * Reused by Discover filtering and (later) compatibility scoring.
 */
export function hasAvailabilityOverlap(
  a: readonly AvailabilitySlot[],
  b: readonly AvailabilitySlot[],
): boolean {
  return a.some((slotA) => {
    const slotB = b.find((entry) => entry.day === slotA.day)
    return slotB
      ? slotA.periods.some((period) => slotB.periods.includes(period))
      : false
  })
}
