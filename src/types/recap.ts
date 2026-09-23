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
