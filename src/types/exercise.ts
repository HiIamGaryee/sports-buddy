import type { SportId } from '@/types/sports-profile'

/**
 * One exercise session, NORMALIZED. The repository is the only thing that
 * knows the raw source's field names; everything above it consumes this.
 *
 * Every field beyond `id`, `date` and the sport labels is optional because the
 * source may simply not carry it. `null` means "the source did not provide
 * this", never "zero" — the recap omits a whole section rather than render a
 * confident 0 for data that was never recorded.
 */
export interface ExerciseActivity {
  /** Stable source id, used to drop duplicate records. */
  id: string
  /** Parsed and already known to be a valid date. */
  date: Date
  /** Catalog id when the source's sport maps to `SPORTS`, otherwise `null`. */
  sportId: SportId | null
  /** Always present: the catalog name, or the tidied source label. */
  sportLabel: string
  durationMinutes: number | null
  venue: string | null
  distanceKm: number | null
}

export interface RecapSportBreakdown {
  sportId: SportId | null
  label: string
  sessions: number
  /** Derived per render, never stored. 0-100, rounded. */
  percentage: number
}

export interface RecapVenueBreakdown {
  name: string
  sessions: number
}

export interface RecapDistanceBreakdown {
  sportId: SportId | null
  label: string
  distanceKm: number
}

/**
 * The derived monthly recap. Optional sections are `null` when the source had
 * no usable data for them, which is what lets the UI hide a section instead of
 * inventing a number.
 */
export interface MonthlyExerciseRecap {
  year: number
  /** 1-12. */
  month: number
  /** `'January 2027'`. */
  label: string
  totalSessions: number
  activeDays: number
  sports: RecapSportBreakdown[]
  topSport: RecapSportBreakdown | null
  totalDurationMinutes: number | null
  averageDurationMinutes: number | null
  venues: RecapVenueBreakdown[] | null
  distances: RecapDistanceBreakdown[] | null
}
