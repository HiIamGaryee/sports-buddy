import {
  ACTIVITY_POST_CAPACITY,
  JOIN_POLICY_OPTIONS,
  VISIBILITY_OPTIONS,
  MAX_POST_BUDGET_RM,
  MAX_POST_HORIZON_DAYS,
  MAX_VENUE_NAME_LENGTH,
} from '@/constants/activity-posts'
import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import { resolvePlannedInstant } from '@/lib/activity'
import { isValidDocumentId } from '@/lib/ids'
import { normalizeSingleLine } from '@/lib/sanitize'
import type {
  ActivityPost,
  ActivityPostDraft,
  CreateActivityPostInput,
  JoinPolicy,
  PostViewerState,
  PostVisibility,
} from '@/types/activity-post'
import type { BudgetPreference } from '@/types/sports-profile'

/**
 * Pure rules for Discover activity posts. No storage, no React, and never the
 * clock: `now` is always passed in, so the same input always gives the same
 * answer.
 */

const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/

const DAY_MS = 24 * 60 * 60 * 1000

/** The author's wall-clock time in their own zone → a real instant. */
export function resolvePostStart(
  localDateTime: string,
  timeZone: string,
): Date | null {
  const match = LOCAL_DATE_TIME.exec(localDateTime)
  if (!match) return null
  return resolvePlannedInstant({
    date: match[1],
    startTime: match[2],
    endTime: match[2],
    timeZone,
  })
}

export const isPostVisibility = (value: unknown): value is PostVisibility =>
  value === 'invite' || VISIBILITY_OPTIONS.some((option) => option.id === value)

export const isJoinPolicy = (value: unknown): value is JoinPolicy =>
  JOIN_POLICY_OPTIONS.some((option) => option.id === value)

const isValidBudget = (budget: BudgetPreference) =>
  Number.isFinite(budget.min) &&
  budget.min >= 0 &&
  budget.min <= MAX_POST_BUDGET_RM &&
  (budget.max === null ||
    (Number.isFinite(budget.max) &&
      budget.max >= budget.min &&
      budget.max <= MAX_POST_BUDGET_RM))

/**
 * One human sentence for the first problem, or `null` when the draft is
 * valid. Enum fields are checked for MEMBERSHIP, never just presence.
 */
export function getActivityPostError(
  draft: ActivityPostDraft,
  now: Date,
): string | null {
  if (!draft.sportId || !SPORTS.some((sport) => sport.id === draft.sportId)) {
    return 'Choose a sport.'
  }

  const start = resolvePostStart(draft.localDateTime, draft.timeZone)
  if (!start) return 'Choose when you are playing.'
  if (start.getTime() <= now.getTime()) {
    return 'Choose a time in the future.'
  }
  if (start.getTime() > now.getTime() + MAX_POST_HORIZON_DAYS * DAY_MS) {
    return `Choose a time within the next ${MAX_POST_HORIZON_DAYS} days.`
  }

  if (!draft.budget || !isValidBudget(draft.budget)) {
    return 'Choose a budget per person.'
  }

  if (!draft.areaId || !AREAS.some((area) => area.id === draft.areaId)) {
    return 'Choose the area you are playing in.'
  }

  const venue = normalizeSingleLine(draft.venueName)
  if (venue.length === 0) return 'Add the venue name.'
  if (venue.length > MAX_VENUE_NAME_LENGTH) {
    return `Keep the venue name under ${MAX_VENUE_NAME_LENGTH} characters.`
  }

  if (!isJoinPolicy(draft.joinPolicy)) return 'Choose who can join.'

  if (!isPostVisibility(draft.visibility)) return 'Choose who can see it.'
  if (draft.visibility === 'invite') {
    if (!isValidDocumentId(draft.invitedId)) return 'Choose who to invite.'
  } else if (draft.invitedId !== null) {
    return 'Choose who can see it.'
  }

  return null
}

/**
 * Validated draft → the exact fields the repository may write. Built field by
 * field, never spread, so nothing a caller attached can reach Firestore.
 */
export function toCreateActivityPostInput(
  authorId: string,
  draft: ActivityPostDraft,
  now: Date,
): CreateActivityPostInput | null {
  if (getActivityPostError(draft, now)) return null
  const start = resolvePostStart(draft.localDateTime, draft.timeZone)
  if (!start || !draft.sportId || !draft.areaId || !draft.budget) return null

  return {
    authorId,
    sportId: draft.sportId,
    startAt: start.toISOString(),
    timeZone: draft.timeZone,
    areaId: draft.areaId,
    venueName: normalizeSingleLine(draft.venueName),
    budget: { min: draft.budget.min, max: draft.budget.max },
    // An invite is taken by accepting it, never by approval.
    joinPolicy: draft.visibility === 'invite' ? 'open' : draft.joinPolicy,
    visibility: draft.visibility,
    invitedId: draft.visibility === 'invite' ? draft.invitedId : null,
  }
}

/**
 * An instant → the wall-clock `YYYY-MM-DDTHH:mm` it was IN THE AUTHOR'S ZONE,
 * so editing a post shows the time exactly as it was posted, whichever device
 * or zone the author edits from. `null` for a malformed instant or zone.
 */
export function toLocalDateTimeInZone(
  iso: string,
  timeZone: string,
): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((entry) => entry.type === type)?.value ?? ''
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
  } catch {
    return null
  }
}

/** A saved post → the form's draft, for editing. */
export function toDraftFromPost(post: ActivityPost): ActivityPostDraft {
  return {
    sportId: post.sportId,
    localDateTime: toLocalDateTimeInZone(post.startAt, post.timeZone) ?? '',
    timeZone: post.timeZone,
    areaId: post.areaId,
    venueName: post.venueName,
    budget: { min: post.budget.min, max: post.budget.max },
    joinPolicy: post.joinPolicy,
    visibility: post.visibility,
    invitedId: post.invitedId,
  }
}

/** Still worth showing: it has not started yet. */
export const isUpcomingPost = (post: Pick<ActivityPost, 'startAt'>, now: Date) =>
  new Date(post.startAt).getTime() > now.getTime()

/** Soonest first, with the id as a stable tie-break. */
export const compareActivityPosts = (a: ActivityPost, b: ActivityPost) =>
  a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id)

/** Every spot is taken. */
export const isPostFull = (post: Pick<ActivityPost, 'joinedIds' | 'capacity'>) =>
  post.joinedIds.length >= post.capacity

/**
 * What ONE viewer can do with a post, in priority order: the author manages
 * it; someone already in it stays in it even once it has started; a finished
 * post is a record; then full, requested, or joinable per the author's
 * policy.
 */
export function getPostViewerState(
  post: ActivityPost,
  viewerId: string,
  now: Date,
): PostViewerState {
  if (post.authorId === viewerId) return 'author'
  if (post.joinedIds.includes(viewerId)) return 'joined'
  if (!isUpcomingPost(post, now)) return 'past'
  if (post.visibility === 'invite') {
    return post.invitedId === viewerId ? 'invited' : 'past'
  }
  if (post.pendingIds.includes(viewerId)) return 'requested'
  if (isPostFull(post)) return 'full'
  return post.joinPolicy === 'approval' ? 'can-request' : 'can-join'
}

/** New posts start empty, with one spot. */
export const NEW_POST_JOINS = {
  capacity: ACTIVITY_POST_CAPACITY,
  joinedIds: [] as string[],
  pendingIds: [] as string[],
}

/** Why a join transition was refused. Mapped to a sentence by the service. */
export type JoinRefusal =
  | 'not-invited'
  | 'full'
  | 'started'
  | 'own-post'
  | 'not-author'
  | 'not-pending'

/** The two lists a join transition may change. `unchanged` means a no-op. */
export type JoinTransition =
  | { ok: true; unchanged: boolean; joinedIds: string[]; pendingIds: string[] }
  | { ok: false; reason: JoinRefusal }

const keep = (post: ActivityPost): JoinTransition => ({
  ok: true,
  unchanged: true,
  joinedIds: post.joinedIds,
  pendingIds: post.pendingIds,
})

/**
 * Tap Join. Idempotent: someone already in or waiting is left as they are.
 * An open post gives the spot immediately; an approval post files a request.
 * Pure — the transaction calls it on the LIVE document, so two people tapping
 * at the same instant cannot both take a single spot.
 */
export function applyJoin(
  post: ActivityPost,
  userId: string,
  now: Date,
): JoinTransition {
  if (post.authorId === userId) return { ok: false, reason: 'own-post' }
  if (post.joinedIds.includes(userId) || post.pendingIds.includes(userId)) {
    return keep(post)
  }
  if (!isUpcomingPost(post, now)) return { ok: false, reason: 'started' }
  if (post.visibility === 'invite' && post.invitedId !== userId) {
    return { ok: false, reason: 'not-invited' }
  }
  if (isPostFull(post)) return { ok: false, reason: 'full' }
  // Accepting an invite takes the spot, whatever the join policy says.
  return post.joinPolicy === 'approval' && post.visibility !== 'invite'
    ? {
        ok: true,
        unchanged: false,
        joinedIds: post.joinedIds,
        pendingIds: [...post.pendingIds, userId],
      }
    : {
        ok: true,
        unchanged: false,
        joinedIds: [...post.joinedIds, userId],
        pendingIds: post.pendingIds,
      }
}

/** Give up a spot or withdraw a request. Idempotent. */
export function applyLeave(post: ActivityPost, userId: string): JoinTransition {
  if (!post.joinedIds.includes(userId) && !post.pendingIds.includes(userId)) {
    return keep(post)
  }
  return {
    ok: true,
    unchanged: false,
    joinedIds: post.joinedIds.filter((id) => id !== userId),
    pendingIds: post.pendingIds.filter((id) => id !== userId),
  }
}

/** Author: a waiting request takes the spot, if one is still free. */
export function applyApprove(
  post: ActivityPost,
  authorId: string,
  userId: string,
): JoinTransition {
  if (post.authorId !== authorId) return { ok: false, reason: 'not-author' }
  if (post.joinedIds.includes(userId)) return keep(post)
  if (!post.pendingIds.includes(userId)) return { ok: false, reason: 'not-pending' }
  if (isPostFull(post)) return { ok: false, reason: 'full' }
  return {
    ok: true,
    unchanged: false,
    joinedIds: [...post.joinedIds, userId],
    pendingIds: post.pendingIds.filter((id) => id !== userId),
  }
}

/** Author: turn down a request, or take someone out of the spot. Idempotent. */
export function applyDecline(
  post: ActivityPost,
  authorId: string,
  userId: string,
): JoinTransition {
  if (post.authorId !== authorId) return { ok: false, reason: 'not-author' }
  return applyLeave(post, userId)
}

/**
 * The spot is taken, so for its author and whoever has it this is a CONFIRMED
 * session — it belongs beside sessions agreed through Plan Together.
 */
export const isConfirmedFor = (post: ActivityPost, viewerId: string) =>
  isPostFull(post) &&
  (post.authorId === viewerId || post.joinedIds.includes(viewerId))
