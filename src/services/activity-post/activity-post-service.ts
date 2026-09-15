import { ACTIVITY_POST_BATCH_LIMIT } from '@/constants/activity-posts'
import { isValidDocumentId } from '@/lib/ids'
import {
  getActivityPostError,
  toCreateActivityPostInput,
} from '@/lib/activity-post'
import { activityPostRepository } from '@/repositories/repositories'
import { toActivityPostMessage } from '@/services/activity-post/activity-post-error'
import type { ActivityPost, ActivityPostDraft } from '@/types/activity-post'

const LOAD_FAILED = "We couldn't load activities."
const POST_FAILED = "We couldn't post your activity. Please try again."
const UPDATE_FAILED = "We couldn't save your changes. Please try again."
const REMOVE_FAILED = "We couldn't remove your activity. Please try again."
const JOIN_FAILED = "We couldn't join this activity. Please try again."
const LEAVE_FAILED = "We couldn't update your spot. Please try again."
const MANAGE_FAILED = "We couldn't update this request. Please try again."

/** How many of your own posts the Activities page reads, past and upcoming. */
const MY_POSTS_LIMIT = 100

/**
 * Discover activity posts. Validation lives HERE as well as in the form — a
 * programmatic caller skips the form, and the rules check it a third time.
 * Every failure becomes one fixed, human sentence; a Firestore code never
 * reaches the screen.
 */
export const activityPostService = {
  async listUpcoming(now: Date): Promise<ActivityPost[]> {
    try {
      return await activityPostRepository.listUpcoming(
        now,
        ACTIVITY_POST_BATCH_LIMIT,
      )
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  /** Everything the signed-in user posted; the caller splits past/planned. */
  async listMine(authorId: string): Promise<ActivityPost[]> {
    if (!isValidDocumentId(authorId)) throw new Error(LOAD_FAILED)
    try {
      return await activityPostRepository.listByAuthor(authorId, MY_POSTS_LIMIT)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  /** `null` for a missing post and an invalid id alike — a guess leaks nothing. */
  async getById(postId: string): Promise<ActivityPost | null> {
    if (!isValidDocumentId(postId)) return null
    try {
      return await activityPostRepository.getById(postId)
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  async create(
    authorId: string,
    draft: ActivityPostDraft,
    now: Date,
  ): Promise<ActivityPost> {
    const problem = getActivityPostError(draft, now)
    if (problem) throw new Error(problem)

    const input = isValidDocumentId(authorId)
      ? toCreateActivityPostInput(authorId, draft, now)
      : null
    if (!input) throw new Error(POST_FAILED)

    try {
      return await activityPostRepository.create(input)
    } catch {
      throw new Error(POST_FAILED)
    }
  },

  /**
   * The author changes time, place, sport or budget — the same validation as
   * posting, so an edit can never move a session into the past.
   */
  async update(
    post: ActivityPost,
    authorId: string,
    draft: ActivityPostDraft,
    now: Date,
  ): Promise<void> {
    if (post.authorId !== authorId) throw new Error(UPDATE_FAILED)

    const problem = getActivityPostError(draft, now)
    if (problem) throw new Error(problem)

    const input = toCreateActivityPostInput(authorId, draft, now)
    if (!input || !isValidDocumentId(post.id)) throw new Error(UPDATE_FAILED)

    try {
      await activityPostRepository.update(post.id, input)
    } catch {
      throw new Error(UPDATE_FAILED)
    }
  },

  async remove(postId: string): Promise<void> {
    if (!isValidDocumentId(postId)) throw new Error(REMOVE_FAILED)
    try {
      await activityPostRepository.remove(postId)
    } catch {
      throw new Error(REMOVE_FAILED)
    }
  },

  /**
   * Posts the user has a spot in, posts they are still waiting on, and
   * private invites a buddy sent them that they have not accepted yet.
   */
  async listJoinedAndRequested(userId: string): Promise<{
    joined: ActivityPost[]
    requested: ActivityPost[]
    invited: ActivityPost[]
  }> {
    if (!isValidDocumentId(userId)) throw new Error(LOAD_FAILED)
    try {
      const [joined, requested, invites] = await Promise.all([
        activityPostRepository.listJoinedBy(userId, MY_POSTS_LIMIT),
        activityPostRepository.listRequestedBy(userId, MY_POSTS_LIMIT),
        activityPostRepository.listInvitedFor(userId, MY_POSTS_LIMIT),
      ])
      // An accepted invite already sits in `joined`.
      const invited = invites.filter((post) => !post.joinedIds.includes(userId))
      return { joined, requested, invited }
    } catch {
      throw new Error(LOAD_FAILED)
    }
  },

  /** Takes the spot (open) or asks for it (approval). Idempotent. */
  async join(postId: string, userId: string): Promise<ActivityPost> {
    if (!isValidDocumentId(postId) || !isValidDocumentId(userId)) {
      throw new Error(JOIN_FAILED)
    }
    try {
      return await activityPostRepository.join(postId, userId)
    } catch (error) {
      throw new Error(toActivityPostMessage(error, JOIN_FAILED))
    }
  },

  async leave(postId: string, userId: string): Promise<void> {
    if (!isValidDocumentId(postId) || !isValidDocumentId(userId)) {
      throw new Error(LEAVE_FAILED)
    }
    try {
      await activityPostRepository.leave(postId, userId)
    } catch (error) {
      throw new Error(toActivityPostMessage(error, LEAVE_FAILED))
    }
  },

  async approve(postId: string, authorId: string, userId: string): Promise<void> {
    if (![postId, authorId, userId].every(isValidDocumentId)) {
      throw new Error(MANAGE_FAILED)
    }
    try {
      await activityPostRepository.approve(postId, authorId, userId)
    } catch (error) {
      throw new Error(toActivityPostMessage(error, MANAGE_FAILED))
    }
  },

  async decline(postId: string, authorId: string, userId: string): Promise<void> {
    if (![postId, authorId, userId].every(isValidDocumentId)) {
      throw new Error(MANAGE_FAILED)
    }
    try {
      await activityPostRepository.decline(postId, authorId, userId)
    } catch (error) {
      throw new Error(toActivityPostMessage(error, MANAGE_FAILED))
    }
  },
}
