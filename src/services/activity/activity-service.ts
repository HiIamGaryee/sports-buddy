import { buildActivityFromPlan, canConfirmActivity, compareByStart } from '@/lib/activity'
import { getOtherParticipantId } from '@/lib/connection'
import { ACTIVITY_BATCH_LIMIT } from '@/repositories/activity/activity-repository'
import { activityRepository } from '@/repositories/repositories'
import {
  ACTIVITY_ERROR_CODES,
  ACTIVITY_FALLBACK_MESSAGES,
  activityError,
  toActivityError,
} from '@/services/activity/activity-error'
import type { Activity } from '@/types/activity'
import type { ActivityPlan } from '@/types/planning'

/**
 * The domain rules for a confirmed activity. No React state, no Firebase.
 *
 * `ActivityPlan` is how two people agreed; `Activity` is what they agreed to
 * do. Confirmation is the one conversion between them, and it is deliberately
 * one-way: an activity is immutable in this step.
 */
export const activityService = {
  canConfirm: canConfirmActivity,

  /**
   * Plan → activity. Idempotent by construction: the activity's id IS the
   * plan's, so a second confirm — from the same person or the other one —
   * returns the existing activity instead of creating a second.
   *
   * Nothing is written unless the plan really is fully agreed; the repository
   * re-verifies that against the live plan inside its transaction.
   */
  async confirm(
    plan: ActivityPlan | null | undefined,
    currentUserId: string,
  ): Promise<Activity> {
    try {
      if (!plan) throw activityError(ACTIVITY_ERROR_CODES.missingPlan)
      if (!plan.participants.includes(currentUserId)) {
        throw activityError(ACTIVITY_ERROR_CODES.notParticipant)
      }
      if (!canConfirmActivity(plan)) {
        throw activityError(ACTIVITY_ERROR_CODES.notConfirmable)
      }

      const input = buildActivityFromPlan(plan, currentUserId)
      // A malformed time, venue or budget stops here rather than persisting.
      if (!input) throw activityError(ACTIVITY_ERROR_CODES.invalid)

      return await activityRepository.createFromPlan(input)
    } catch (error) {
      throw toActivityError(error, ACTIVITY_FALLBACK_MESSAGES.confirm)
    }
  },

  /**
   * The signed-in user's upcoming activities, soonest first. Filtering and
   * ordering happen here rather than in the query, which keeps the read
   * index-free (see docs/activities.md §11).
   */
  async getUpcoming(userId: string): Promise<Activity[]> {
    try {
      const activities = await activityRepository.getForUser(
        userId,
        ACTIVITY_BATCH_LIMIT,
      )
      return activities
        .filter((activity) => activity.status === 'upcoming')
        .sort(compareByStart)
    } catch (error) {
      throw toActivityError(error, ACTIVITY_FALLBACK_MESSAGES.load)
    }
  },

  /**
   * `null` for a missing activity AND for one the caller is not part of, so
   * a guessed id never reveals whether somebody else's activity exists.
   */
  async getForParticipant(
    activityId: string,
    userId: string,
  ): Promise<Activity | null> {
    try {
      const activity = await activityRepository.getById(activityId)
      if (!activity || !activity.participants.includes(userId)) return null
      return activity
    } catch (error) {
      throw toActivityError(error, ACTIVITY_FALLBACK_MESSAGES.detail)
    }
  },

  /** The other person, using the STEP 8 helper rather than a second one. */
  getBuddyId: (activity: Activity, currentUserId: string) =>
    getOtherParticipantId(activity, currentUserId),
}
