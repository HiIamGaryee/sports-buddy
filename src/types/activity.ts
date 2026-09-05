import type { SportId } from '@/types/sports-profile'
import type { VenueSelection } from '@/types/venue'

/**
 * Only `upcoming` is implemented. The other two are declared so STEP 13+ can
 * add their workflows without a type change — nothing in the app produces or
 * renders them yet.
 */
export type ActivityStatus = 'upcoming' | 'completed' | 'cancelled'

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
