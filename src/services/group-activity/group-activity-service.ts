import { GROUP_ACTIVITY_BATCH_LIMIT } from '@/constants/group-activities'
import {
  canHostAnotherGroupActivity,
  canJoinAnotherGroupActivity,
} from '@/lib/capabilities'
import { getGroupActivityError, isUpcomingGroupActivity, toCreateGroupActivityInput } from '@/lib/group-activity'
import { isValidDocumentId } from '@/lib/ids'
import { groupActivityRepository } from '@/repositories/repositories'
import {
  GROUP_ACTIVITY_ERROR_CODES,
  groupActivityError,
  toGroupActivityMessage,
} from '@/services/group-activity/group-activity-error'
import type { GroupActivity, GroupActivityDraft } from '@/types/group-activity'
import type { SubscriptionState } from '@/types/subscription'

const LOAD_FAILED = "We couldn't load activities."
const CREATE_FAILED = "We couldn't create this activity. Please try again."
const UPDATE_FAILED = "We couldn't save your changes. Please try again."
const REMOVE_FAILED = "We couldn't remove this activity. Please try again."
const JOIN_FAILED = "We couldn't join this activity. Please try again."
const LEAVE_FAILED = "We couldn't update your spot. Please try again."
const MANAGE_FAILED = "We couldn't update this participant. Please try again."

/** How many of your own activities the Activities page reads, past and upcoming. */
const MY_ACTIVITIES_LIMIT = 100

/**
 * Public group activities. Validation lives HERE as well as in the form — a
 * programmatic caller skips the form, and the rules check identity a third
 * time.
 *
 * Free/Buddy+ limits (`FREE_MAX_HOSTED_GROUP_ACTIVITIES` /
 * `FREE_MAX_JOINED_GROUP_ACTIVITIES`) are enforced HERE, before the write —
 * counting the caller's own live documents, the same trust level as every
 * other client-only validation in this app. This is an HONEST, DOCUMENTED
 * LIMITATION: `firestore.rules` cannot count a member's other documents in a
 * `create` rule without a maintained counter, so a modified client could
 * still exceed the cap by calling Firestore directly. See
 * `docs/monetization.md`.
 */
export const groupActivityService = {
  async listUpcoming(now: Date): Promise<GroupActivity[]> {
    try {
      return await groupActivityRepository.listUpcoming(now, GROUP_ACTIVITY_BATCH_LIMIT)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  async listMine(organizerId: string): Promise<GroupActivity[]> {
    if (!isValidDocumentId(organizerId)) throw new Error(LOAD_FAILED)
    try {
      return await groupActivityRepository.listByOrganizer(organizerId, MY_ACTIVITIES_LIMIT)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  async listJoined(userId: string): Promise<GroupActivity[]> {
    if (!isValidDocumentId(userId)) throw new Error(LOAD_FAILED)
    try {
      return await groupActivityRepository.listJoinedBy(userId, MY_ACTIVITIES_LIMIT)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  async getById(activityId: string): Promise<GroupActivity | null> {
    if (!isValidDocumentId(activityId)) return null
    try {
      return await groupActivityRepository.getById(activityId)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  async create(
    organizerId: string,
    draft: GroupActivityDraft,
    now: Date,
    subscriptionState: SubscriptionState,
  ): Promise<GroupActivity> {
    const problem = getGroupActivityError(draft, now)
    if (problem) throw new Error(problem)

    const input = isValidDocumentId(organizerId)
      ? toCreateGroupActivityInput(organizerId, draft, now)
      : null
    if (!input) throw new Error(CREATE_FAILED)

    // Count only ACTIVE (upcoming) hosted activities — a wrapped-up one
    // frees the slot, matching "simultaneously" rather than "per month".
    const hosted = await this.listMine(organizerId)
    const activeHosted = hosted.filter((activity) => isUpcomingGroupActivity(activity, now)).length
    if (!canHostAnotherGroupActivity(subscriptionState, activeHosted)) {
      throw new Error(toGroupActivityMessage(groupActivityError(GROUP_ACTIVITY_ERROR_CODES.hostLimit), CREATE_FAILED))
    }

    try {
      return await groupActivityRepository.create(input)
    } catch {
      throw new Error(CREATE_FAILED)
    }
  },

  async update(
    activity: GroupActivity,
    organizerId: string,
    draft: GroupActivityDraft,
    now: Date,
  ): Promise<void> {
    if (activity.organizerId !== organizerId) throw new Error(UPDATE_FAILED)

    const problem = getGroupActivityError(draft, now)
    if (problem) throw new Error(problem)

    const input = toCreateGroupActivityInput(organizerId, draft, now)
    if (!input || !isValidDocumentId(activity.id)) throw new Error(UPDATE_FAILED)

    try {
      await groupActivityRepository.update(activity.id, input)
    } catch {
      throw new Error(UPDATE_FAILED)
    }
  },

  async remove(activityId: string): Promise<void> {
    if (!isValidDocumentId(activityId)) throw new Error(REMOVE_FAILED)
    try {
      await groupActivityRepository.remove(activityId)
    } catch {
      throw new Error(REMOVE_FAILED)
    }
  },

  async join(
    activityId: string,
    userId: string,
    now: Date,
    subscriptionState: SubscriptionState,
  ): Promise<GroupActivity> {
    if (!isValidDocumentId(activityId) || !isValidDocumentId(userId)) {
      throw new Error(JOIN_FAILED)
    }

    const joined = await this.listJoined(userId)
    const activeJoined = joined.filter((activity) => isUpcomingGroupActivity(activity, now)).length
    if (!canJoinAnotherGroupActivity(subscriptionState, activeJoined)) {
      throw new Error(toGroupActivityMessage(groupActivityError(GROUP_ACTIVITY_ERROR_CODES.joinLimit), JOIN_FAILED))
    }

    try {
      return await groupActivityRepository.join(activityId, userId)
    } catch (error) {
      throw new Error(toGroupActivityMessage(error, JOIN_FAILED))
    }
  },

  async leave(activityId: string, userId: string): Promise<void> {
    if (!isValidDocumentId(activityId) || !isValidDocumentId(userId)) {
      throw new Error(LEAVE_FAILED)
    }
    try {
      await groupActivityRepository.leave(activityId, userId)
    } catch (error) {
      throw new Error(toGroupActivityMessage(error, LEAVE_FAILED))
    }
  },

  /** Organizer only: take a no-show (or anyone) out of the participant list. */
  async removeParticipant(activityId: string, organizerId: string, userId: string): Promise<void> {
    if (![activityId, organizerId, userId].every(isValidDocumentId)) {
      throw new Error(MANAGE_FAILED)
    }
    try {
      await groupActivityRepository.removeParticipant(activityId, organizerId, userId)
    } catch (error) {
      throw new Error(toGroupActivityMessage(error, MANAGE_FAILED))
    }
  },
}
