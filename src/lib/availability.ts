import { DAY_PERIODS, WEEK_DAYS } from '@/constants/profile-options'
import type { AvailabilitySlot } from '@/types/sports-profile'

/**
 * Shared day+period slots, always in week order so anything built from it
 * (reason text, counts) is deterministic. The one implementation of
 * availability overlap — Discover filtering and compatibility both use it.
 */
export function getSharedAvailability(
  a: readonly AvailabilitySlot[],
  b: readonly AvailabilitySlot[],
): AvailabilitySlot[] {
  return WEEK_DAYS.flatMap(({ id: day }) => {
    const slotA = a.find((entry) => entry.day === day)
    const slotB = b.find((entry) => entry.day === day)
    if (!slotA || !slotB) return []

    const periods = DAY_PERIODS.filter(
      ({ id: period }) =>
        slotA.periods.includes(period) && slotB.periods.includes(period),
    ).map(({ id: period }) => period)

    return periods.length > 0 ? [{ day, periods }] : []
  })
}

/** Total shared periods, not shared days: Sat afternoon + Sat evening is 2. */
export const countSharedPeriods = (
  a: readonly AvailabilitySlot[],
  b: readonly AvailabilitySlot[],
) =>
  getSharedAvailability(a, b).reduce(
    (total, slot) => total + slot.periods.length,
    0,
  )

/** Pure availability overlap: do two people share at least one day+period? */
export const hasAvailabilityOverlap = (
  a: readonly AvailabilitySlot[],
  b: readonly AvailabilitySlot[],
) => getSharedAvailability(a, b).length > 0
