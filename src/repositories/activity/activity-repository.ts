import type { Activity, ActivityPage, CreateActivityInput } from '@/types/activity'

/**
 * Confirmed activities. The repository owns persistence, the atomicity of the
 * plan→activity conversion and the queries; the service owns the rules.
 *
 * Activities are IMMUTABLE — there is deliberately no update or delete
 * method, because reschedule, cancel and completion are later steps. Nothing
 * here writes a temporal state either: upcoming/past is derived from `endAt`
 * at read time, so time passing never requires a write.
 */
export interface ActivityRepository {
  /**
   * Idempotent conversion. Creates `activities/{planId}` and marks the plan
   * confirmed in ONE atomic operation; if the activity already exists it is
   * returned untouched, so two people confirming at once get one activity.
   */
  createFromPlan(input: CreateActivityInput): Promise<Activity>

  /** `null` when it does not exist or the caller may not read it. */
  getById(activityId: string): Promise<Activity | null>

  /**
   * Sessions that have not finished, soonest first — `endAt >= now`.
   * Scoped by `participants array-contains userId`; never a query over all
   * activities.
   *
   * `cursor` is an activity ID from a previous page, not a Firestore
   * snapshot: the SDK's cursor type never leaves this layer.
   */
  getUpcomingForUser(query: ActivityQuery): Promise<ActivityPage>

  /**
   * Sessions that have finished, most recent first — `endAt < now`.
   * Same scoping and the same opaque cursor.
   */
  getPastForUser(query: ActivityQuery): Promise<ActivityPage>

  /** Confirmed sessions beginning inside a bounded calendar range. */
  getForUserInRange(query: ActivityRangeQuery): Promise<Activity[]>
}

/** One page request. `now` is injected so the boundary is never the clock. */
export interface ActivityQuery {
  userId: string
  now: Date
  limit: number
  /** An activity ID returned as `nextCursor` by the previous page. */
  cursor?: string | null
}

export interface ActivityRangeQuery {
  userId: string
  startAtFrom: Date
  startAtBefore: Date
  now: Date
  limit: number
}

export const ACTIVITIES_COLLECTION = 'activities'
