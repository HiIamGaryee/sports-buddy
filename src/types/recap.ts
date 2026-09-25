import type { SportId } from '@/types/sports-profile'

/**
 * A member's monthly recap — computed on demand from EXISTING data
 * (confirmed 1-to-1 activities, group activities, attendance records),
 * never stored. Same rule as a compatibility score: derived per request,
 * not persisted, so it can never go stale.
 */
export interface SportRecapEntry {
  sportId: SportId
  count: number
}

/** How many of the month's sessions were with one particular person. */
export interface BuddyRecapEntry {
  userId: string
  count: number
}

export interface VenueRecapEntry {
  name: string
  count: number
}

export interface MonthlyRecap {
  /** `YYYY-MM`, so recaps compare and sort without parsing a label. */
  monthKey: string
  /** Already formatted for display, e.g. "September 2026". */
  monthLabel: string
  /** Most-played sport first. Empty when nothing happened that month. */
  sports: SportRecapEntry[]
  topSport: SportRecapEntry | null
  totalSessions: number
  activeDays: number
  /** Activity documents do not currently store duration. */
  totalDurationMinutes: number | null
  /** Only populated when a confirmed activity carries a venue snapshot. */
  venues: VenueRecapEntry[] | null
  /**
   * Who the month was spent with, most-played-with first: the other person on
   * a confirmed session, and everyone else in a group activity. Ids only —
   * names and photos are resolved from `publicProfiles` at render time, the
   * same rule every other surface follows.
   */
  buddies: BuddyRecapEntry[]
  /**
   * QR-verified GROUP activities only. 1-to-1 activity posts also support
   * check-in now (see `docs/attendance.md`), but the recap is not yet given
   * them, so this number stays group-only — deliberately under-counting
   * rather than guessing. Sessions confirmed through Plan Together have no
   * check-in at all and can never count here.
   */
  verifiedSessions: number
  /** `null`, never `0%`, when nothing started that month yet. */
  showUpRatePercent: number | null
}
