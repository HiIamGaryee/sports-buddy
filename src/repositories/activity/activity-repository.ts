import type { Activity, CreateActivityInput } from '@/types/activity'

/**
 * Confirmed activities. The repository owns persistence, the atomicity of the
 * plan→activity conversion and the queries; the service owns the rules.
 *
 * Activities are IMMUTABLE in this step — there is deliberately no update or
 * delete method, because reschedule, cancel and completion are later steps.
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
   * The signed-in user's own activities. Scoped by
   * `participants array-contains userId` — never a query over all activities.
   */
  getForUser(userId: string, limit: number): Promise<Activity[]>
}

export const ACTIVITIES_COLLECTION = 'activities'

/**
 * A generous ceiling for an MVP account. Filtering by status and ordering by
 * start time happen client-side, which keeps the query index-free — see
 * docs/activities.md §11.
 */
export const ACTIVITY_BATCH_LIMIT = 50
