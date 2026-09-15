import { MOCK_STORAGE_KEYS } from '@/constants/app'
import {
  applyApprove,
  applyDecline,
  applyJoin,
  applyLeave,
  compareActivityPosts,
  isUpcomingPost,
  NEW_POST_JOINS,
  type JoinTransition,
} from '@/lib/activity-post'
import { delay, readStoreArray, writeStore } from '@/repositories/mock-store'
import {
  ACTIVITY_POST_ERROR_CODES,
  activityPostError,
  refusalError,
} from '@/services/activity-post/activity-post-error'
import type { ActivityPostRepository } from '@/repositories/activity-post/activity-post-repository'
import type { ActivityPost } from '@/types/activity-post'

const isActivityPost = (value: unknown): value is ActivityPost => {
  if (!value || typeof value !== 'object') return false
  const post = value as Record<string, unknown>
  return (
    typeof post.id === 'string' &&
    typeof post.authorId === 'string' &&
    typeof post.sportId === 'string' &&
    typeof post.startAt === 'string' &&
    typeof post.areaId === 'string' &&
    typeof post.venueName === 'string' &&
    !!post.budget &&
    typeof post.budget === 'object'
  )
}

const asIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []

/** Posts saved before joins existed read with the same defaults as Firestore. */
const normalize = (post: ActivityPost): ActivityPost => ({
  ...post,
  joinPolicy: post.joinPolicy === 'approval' ? 'approval' : 'open',
  visibility:
    post.visibility === 'link' || post.visibility === 'invite'
      ? post.visibility
      : 'public',
  invitedId: post.visibility === 'invite' ? (post.invitedId ?? null) : null,
  capacity:
    typeof post.capacity === 'number' && post.capacity >= 1
      ? post.capacity
      : NEW_POST_JOINS.capacity,
  joinedIds: asIds(post.joinedIds),
  pendingIds: asIds(post.pendingIds),
  updatedAt: post.updatedAt ?? null,
})

const read = () =>
  readStoreArray<ActivityPost>(MOCK_STORAGE_KEYS.activityPosts, isActivityPost).map(
    normalize,
  )

const write = (posts: ActivityPost[]) =>
  writeStore(MOCK_STORAGE_KEYS.activityPosts, posts)

async function transitionJoins(
  postId: string,
  transition: (post: ActivityPost) => JoinTransition,
): Promise<ActivityPost> {
  await delay(null, 150)
  const posts = read()
  const post = posts.find((entry) => entry.id === postId)
  if (!post) throw activityPostError(ACTIVITY_POST_ERROR_CODES.missing)

  const next = transition(post)
  if (!next.ok) throw refusalError(next.reason)
  if (next.unchanged) return post

  const updated = { ...post, joinedIds: next.joinedIds, pendingIds: next.pendingIds }
  write(posts.map((entry) => (entry.id === postId ? updated : entry)))
  return updated
}

let nextId = 0

/** localStorage-backed, with the same ordering, limits and transitions as Firestore. */
export const mockActivityPostRepository: ActivityPostRepository = {
  async listUpcoming(now, limit) {
    return delay(
      read()
        .filter((post) => post.visibility === 'public' && isUpcomingPost(post, now))
        .sort(compareActivityPosts)
        .slice(0, limit),
    )
  },

  async listByAuthor(authorId, limit) {
    return delay(read().filter((post) => post.authorId === authorId).slice(0, limit))
  },

  async listJoinedBy(userId, limit) {
    return delay(read().filter((post) => post.joinedIds.includes(userId)).slice(0, limit))
  },

  async listRequestedBy(userId, limit) {
    return delay(read().filter((post) => post.pendingIds.includes(userId)).slice(0, limit))
  },

  async listInvitedFor(userId, limit) {
    return delay(read().filter((post) => post.invitedId === userId).slice(0, limit))
  },

  async getById(postId) {
    return delay(read().find((post) => post.id === postId) ?? null)
  },

  async create(input) {
    nextId += 1
    const post: ActivityPost = {
      id: `mock_post_${Date.now()}_${nextId}`,
      authorId: input.authorId,
      sportId: input.sportId,
      startAt: input.startAt,
      timeZone: input.timeZone,
      areaId: input.areaId,
      venueName: input.venueName,
      budget: { min: input.budget.min, max: input.budget.max },
      joinPolicy: input.joinPolicy,
      visibility: input.visibility,
      invitedId: input.invitedId,
      capacity: NEW_POST_JOINS.capacity,
      joinedIds: [],
      pendingIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: null,
    }
    write([...read(), post])
    return delay(post)
  },

  async update(postId, input) {
    const posts = read()
    const existing = posts.find((post) => post.id === postId)
    // Mirrors the rules: only the author, and identity fields never move.
    if (!existing || existing.authorId !== input.authorId) {
      throw activityPostError(ACTIVITY_POST_ERROR_CODES.notAuthor)
    }
    write(
      posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              sportId: input.sportId,
              startAt: input.startAt,
              timeZone: input.timeZone,
              areaId: input.areaId,
              venueName: input.venueName,
              budget: { min: input.budget.min, max: input.budget.max },
              joinPolicy: input.joinPolicy,
              visibility: input.visibility,
              updatedAt: new Date().toISOString(),
            }
          : post,
      ),
    )
    await delay(null)
  },

  async remove(postId) {
    write(read().filter((post) => post.id !== postId))
    await delay(null)
  },

  join(postId, userId) {
    return transitionJoins(postId, (post) => applyJoin(post, userId, new Date()))
  },

  async leave(postId, userId) {
    await transitionJoins(postId, (post) => applyLeave(post, userId))
  },

  async approve(postId, authorId, userId) {
    await transitionJoins(postId, (post) => applyApprove(post, authorId, userId))
  },

  async decline(postId, authorId, userId) {
    await transitionJoins(postId, (post) => applyDecline(post, authorId, userId))
  },
}
