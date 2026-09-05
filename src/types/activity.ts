import type { SportId } from '@/types/sports-profile'
import type { VenueSelection } from '@/types/venue'

/**
 * The PERSISTED BUSINESS state of an activity: the two people agreed to go.
 * It says nothing about time.
 *
 * `completed` and `cancelled` are deliberately absent — attendance and
 * cancellation are not implemented, and declaring states nothing produces
 * invites code that pretends they exist.
 */
export type ActivityStatus = 'confirmed'

/**
 * Statuses written by STEP 12, before business state and temporal state were
 * separated. Read-normalized to `confirmed`; never written again.
 */
export type LegacyActivityStatus = 'upcoming' | 'completed' | 'cancelled'

/**
 * WHERE a confirmed activity sits on the timeline. DERIVED from `endAt` and
 * the current time, never stored — persisting it would need a background job
 * to keep it true, and would be stale the moment it was written.
 *
 * `past` means only that the end time has passed. It does NOT mean the
 * session happened, that anyone attended, or that it was completed.
 */
export type ActivityTemporalState = 'upcoming' | 'past'

/** Structured money, never a display string. MYR is the launch market. */
export interface ActivityBudget {
  min: number
  /** `null` means open ended (RM60+). */
  max: number | null
  currency: 'MYR'
  unit: 'per-person'
}

/**
 * What two people agreed to actually do — a stable SNAPSHOT taken at
 * confirmation, not a live view of the plan.
 *
 * `ActivityPlan` is *how* they agreed; `Activity` is *what* they agreed to.
 * Once written it is immutable: no reschedule, no venue change, no
 * cancellation in this step.
 */
export interface Activity {
  /** Equals `sourcePlanId` — one plan produces at most one activity. */
  id: string
  sourcePlanId: string
  connectionId: string
  participants: [string, string]
  sportId: SportId
  /** Real instants, resolved from the plan's local time and IANA zone. */
  startAt: string
  endAt: string
  budget: ActivityBudget
  /** The STEP 11 snapshot, carried over — no second Places request. */
  venue: VenueSelection
  status: ActivityStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** Everything the repository needs to write one, already validated. */
export interface CreateActivityInput {
  id: string
  sourcePlanId: string
  connectionId: string
  participants: [string, string]
  sportId: SportId
  startAt: string
  endAt: string
  budget: ActivityBudget
  venue: VenueSelection
  createdBy: string
}

/** An activity plus the discovery-safe buddy details a card needs. */
export interface ActivityWithBuddy {
  activity: Activity
  buddyId: string
  buddyName: string
  buddyPhotoUrl: string | null
}

/**
 * One page of activities. `nextCursor` is an activity ID, never a Firestore
 * snapshot — the same rule STEP 9 chat pagination follows, so the SDK's
 * cursor type never leaves the repository.
 */
export interface ActivityPage {
  activities: Activity[]
  nextCursor: string | null
}

/** A month of history: `2026-09` plus the activities that fall in it. */
export interface ActivityMonthGroup {
  /** `YYYY-MM`, so groups sort without parsing a label. */
  key: string
  /** Already formatted for display, e.g. "September 2026". */
  label: string
  activities: Activity[]
}
