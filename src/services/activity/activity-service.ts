import {
  buildActivityFromPlan,
  canConfirmActivity,
  getActivityTemporalState,
  getNextActivity,
  isActivityHappeningNow,
} from '@/lib/activity'
import { getOtherParticipantId } from '@/lib/connection'
import { isValidDocumentId } from '@/lib/ids'
import { ACTIVITY_PAGE_SIZE } from '@/constants/activities'
import { activityRepository } from '@/repositories/repositories'
import {
  ACTIVITY_ERROR_CODES,
  ACTIVITY_FALLBACK_MESSAGES,
  activityError,
  toActivityError,
} from '@/services/activity/activity-error'
import type { Activity, ActivityPage } from '@/types/activity'
import type { ActivityPlan } from '@/types/planning'

/**
 * Both lists are the same call with a different time bound, so the guard
 * clauses and the error mapping live once. An invalid user id returns an
 * empty page rather than reaching a query.
 */
async function readPage(
  kind: 'upcoming' | 'past',
  userId: string,
  now: Date,
  cursor?: string | null,
): Promise<ActivityPage> {
  if (!isValidDocumentId(userId)) return { activities: [], nextCursor: null }

  const request = {
    userId,
    now,
    limit: ACTIVITY_PAGE_SIZE,
    cursor: cursor && isValidDocumentId(cursor) ? cursor : null,
  }

  try {
    return kind === 'upcoming'
      ? await activityRepository.getUpcomingForUser(request)
      : await activityRepository.getPastForUser(request)
  } catch (error) {
    throw toActivityError(error, ACTIVITY_FALLBACK_MESSAGES.load)
  }
}

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
   * The signed-in user's sessions that have not finished, soonest first.
   *
   * `now` is INJECTED, and the bound is applied in the QUERY rather than by
   * loading everything and filtering. That is what stops Home showing
   * yesterday's session, and it is why time passing never needs a write.
   */
  getUpcoming(userId: string, now: Date, cursor?: string | null) {
    return readPage('upcoming', userId, now, cursor)
  },

  /**
   * Finished sessions, most recent first.
   *
   * PAST MEANS THE END TIME HAS PASSED — nothing more. It does not mean the
   * session happened, that anyone attended, or that it was completed. No code
   * here may treat it as evidence of any of those.
   */
  getPast(userId: string, now: Date, cursor?: string | null) {
    return readPage('past', userId, now, cursor)
  },

  /**
   * The one session Home leads with: the soonest that has not ended. `null`
   * when there is nothing coming up.
   */
  async getNext(userId: string, now: Date): Promise<Activity | null> {
    const { activities } = await readPage('upcoming', userId, now, null)
    return getNextActivity(activities, now)
  },

  /**
   * `null` for a missing activity AND for one the caller is not part of, so
   * a guessed id never reveals whether somebody else's activity exists.
   */
  async getForParticipant(
    activityId: string,
    userId: string,
  ): Promise<Activity | null> {
    // Validation before authorization: a malformed id must not reach
    // `doc(db, ACTIVITIES_COLLECTION, id)` at all. A rejected id resolves the
    // same way a missing one does, so nothing is revealed either way.
    if (!isValidDocumentId(activityId) || !isValidDocumentId(userId)) return null

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

  /** Re-exported so a page never imports the temporal rule from two places. */
  getTemporalState: getActivityTemporalState,
  isHappeningNow: isActivityHappeningNow,
}
