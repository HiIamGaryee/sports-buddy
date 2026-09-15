import {
  MAX_GROUP_ACTIVITY_BUDGET_RM,
  MAX_GROUP_ACTIVITY_DESCRIPTION_LENGTH,
  MAX_GROUP_ACTIVITY_HORIZON_DAYS,
  MAX_GROUP_ACTIVITY_PARTICIPANTS,
  MAX_GROUP_ACTIVITY_TITLE_LENGTH,
  MAX_GROUP_ACTIVITY_VENUE_NAME_LENGTH,
  MIN_GROUP_ACTIVITY_PARTICIPANTS,
  SKILL_PREFERENCE_OPTIONS,
} from '@/constants/group-activities'
import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import { resolvePlannedInstant } from '@/lib/activity'
import { normalizeMultiLine, normalizeSingleLine } from '@/lib/sanitize'
import type {
  CreateGroupActivityInput,
  GroupActivity,
  GroupActivityDraft,
  GroupActivityViewerState,
  SkillPreference,
} from '@/types/group-activity'
import type { BudgetPreference } from '@/types/sports-profile'

/**
 * Pure rules for public group activities. No storage, no React, and never
 * the clock — `now` is always passed in. Mirrors `src/lib/activity-post.ts`'s
 * shape so the two features read the same way, without sharing state (a
 * group activity is its own collection, not a variant of a post).
 */

const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/
const DAY_MS = 24 * 60 * 60 * 1000

function resolveInstant(localDateTime: string, timeZone: string): Date | null {
  const match = LOCAL_DATE_TIME.exec(localDateTime)
  if (!match) return null
  return resolvePlannedInstant({
    date: match[1],
    startTime: match[2],
    endTime: match[2],
    timeZone,
  })
}

export const isSkillPreference = (value: unknown): value is SkillPreference =>
  SKILL_PREFERENCE_OPTIONS.some((option) => option.id === value)

const isValidBudget = (budget: BudgetPreference) =>
  Number.isFinite(budget.min) &&
  budget.min >= 0 &&
  budget.min <= MAX_GROUP_ACTIVITY_BUDGET_RM &&
  (budget.max === null ||
    (Number.isFinite(budget.max) &&
      budget.max >= budget.min &&
      budget.max <= MAX_GROUP_ACTIVITY_BUDGET_RM))

/** One human sentence for the first problem, or `null` when the draft is valid. */
export function getGroupActivityError(draft: GroupActivityDraft, now: Date): string | null {
  if (!draft.sportId || !SPORTS.some((sport) => sport.id === draft.sportId)) {
    return 'Choose a sport.'
  }

  const title = normalizeSingleLine(draft.title)
  if (title.length === 0) return 'Give the activity a title.'
  if (title.length > MAX_GROUP_ACTIVITY_TITLE_LENGTH) {
    return `Keep the title under ${MAX_GROUP_ACTIVITY_TITLE_LENGTH} characters.`
  }

  const description = normalizeMultiLine(draft.description)
  if (description.length > MAX_GROUP_ACTIVITY_DESCRIPTION_LENGTH) {
    return `Keep the description under ${MAX_GROUP_ACTIVITY_DESCRIPTION_LENGTH} characters.`
  }

  const start = resolveInstant(draft.localStartDateTime, draft.timeZone)
  if (!start) return 'Choose when the activity starts.'
  if (start.getTime() <= now.getTime()) return 'Choose a start time in the future.'
  if (start.getTime() > now.getTime() + MAX_GROUP_ACTIVITY_HORIZON_DAYS * DAY_MS) {
    return `Choose a time within the next ${MAX_GROUP_ACTIVITY_HORIZON_DAYS} days.`
  }

  if (draft.localEndDateTime) {
    const end = resolveInstant(draft.localEndDateTime, draft.timeZone)
    if (!end) return 'Choose a valid end time.'
    if (end.getTime() <= start.getTime()) return 'The end time must be after the start.'
  }

  if (!draft.budget || !isValidBudget(draft.budget)) {
    return 'Choose an estimated price per person.'
  }

  if (!draft.areaId || !AREAS.some((area) => area.id === draft.areaId)) {
    return 'Choose the area.'
  }

  const venue = normalizeSingleLine(draft.venueName)
  if (venue.length === 0) return 'Add the venue name.'
  if (venue.length > MAX_GROUP_ACTIVITY_VENUE_NAME_LENGTH) {
    return `Keep the venue name under ${MAX_GROUP_ACTIVITY_VENUE_NAME_LENGTH} characters.`
  }

  if (!isSkillPreference(draft.preferredSkillLevel)) return 'Choose a preferred skill level.'

  if (
    !Number.isInteger(draft.maxParticipants) ||
    draft.maxParticipants < MIN_GROUP_ACTIVITY_PARTICIPANTS ||
    draft.maxParticipants > MAX_GROUP_ACTIVITY_PARTICIPANTS
  ) {
    return `Choose between ${MIN_GROUP_ACTIVITY_PARTICIPANTS} and ${MAX_GROUP_ACTIVITY_PARTICIPANTS} players.`
  }

  return null
}

/** Validated draft → the exact fields the repository may write. Never a spread. */
export function toCreateGroupActivityInput(
  organizerId: string,
  draft: GroupActivityDraft,
  now: Date,
): CreateGroupActivityInput | null {
  if (getGroupActivityError(draft, now)) return null
  const start = resolveInstant(draft.localStartDateTime, draft.timeZone)
  const end = draft.localEndDateTime ? resolveInstant(draft.localEndDateTime, draft.timeZone) : null
  if (!start || !draft.sportId || !draft.areaId || !draft.budget) return null

  return {
    organizerId,
    sportId: draft.sportId,
    title: normalizeSingleLine(draft.title),
    description: normalizeMultiLine(draft.description),
    startAt: start.toISOString(),
    endAt: end ? end.toISOString() : null,
    timeZone: draft.timeZone,
    areaId: draft.areaId,
    venueName: normalizeSingleLine(draft.venueName),
    budget: { min: draft.budget.min, max: draft.budget.max },
    preferredSkillLevel: draft.preferredSkillLevel,
    maxParticipants: draft.maxParticipants,
  }
}

/** An instant → the wall-clock value the author's own zone would show, for editing. */
export function toLocalDateTimeInZone(iso: string, timeZone: string): string | null {
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

export function toDraftFromGroupActivity(activity: GroupActivity): GroupActivityDraft {
  return {
    sportId: activity.sportId,
    title: activity.title,
    description: activity.description,
    localStartDateTime: toLocalDateTimeInZone(activity.startAt, activity.timeZone) ?? '',
    localEndDateTime: activity.endAt
      ? (toLocalDateTimeInZone(activity.endAt, activity.timeZone) ?? '')
      : '',
    timeZone: activity.timeZone,
    areaId: activity.areaId,
    venueName: activity.venueName,
    budget: { min: activity.budget.min, max: activity.budget.max },
    preferredSkillLevel: activity.preferredSkillLevel,
    maxParticipants: activity.maxParticipants,
  }
}

/** Still worth showing: it has not started yet. */
export const isUpcomingGroupActivity = (
  activity: Pick<GroupActivity, 'startAt'>,
  now: Date,
) => new Date(activity.startAt).getTime() > now.getTime()

/** Soonest first, with the id as a stable tie-break. */
export const compareGroupActivities = (a: GroupActivity, b: GroupActivity) =>
  a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id)

export const isGroupActivityFull = (
  activity: Pick<GroupActivity, 'participantIds' | 'maxParticipants'>,
) => activity.participantIds.length >= activity.maxParticipants

export const groupActivitySpotsLeft = (
  activity: Pick<GroupActivity, 'participantIds' | 'maxParticipants'>,
) => Math.max(0, activity.maxParticipants - activity.participantIds.length)

export function getGroupActivityViewerState(
  activity: GroupActivity,
  viewerId: string,
  now: Date,
): GroupActivityViewerState {
  if (activity.organizerId === viewerId) return 'organizer'
  if (activity.participantIds.includes(viewerId)) return 'joined'
  if (!isUpcomingGroupActivity(activity, now)) return 'past'
  return isGroupActivityFull(activity) ? 'full' : 'can-join'
}

/** Why a join/leave transition was refused. Mapped to a sentence by the service. */
export type GroupActivityRefusal = 'full' | 'started' | 'is-organizer' | 'not-organizer'

export type GroupActivityJoinTransition =
  | { ok: true; unchanged: boolean; participantIds: string[] }
  | { ok: false; reason: GroupActivityRefusal }

/**
 * Tap Join. Idempotent, and pure — the transaction calls it on the LIVE
 * document, so two people joining the last spot at once cannot both take it.
 */
export function applyJoinGroupActivity(
  activity: GroupActivity,
  userId: string,
  now: Date,
): GroupActivityJoinTransition {
  if (activity.organizerId === userId) return { ok: false, reason: 'is-organizer' }
  if (activity.participantIds.includes(userId)) {
    return { ok: true, unchanged: true, participantIds: activity.participantIds }
  }
  if (!isUpcomingGroupActivity(activity, now)) return { ok: false, reason: 'started' }
  if (isGroupActivityFull(activity)) return { ok: false, reason: 'full' }
  return { ok: true, unchanged: false, participantIds: [...activity.participantIds, userId] }
}

export function applyLeaveGroupActivity(
  activity: GroupActivity,
  userId: string,
): GroupActivityJoinTransition {
  if (!activity.participantIds.includes(userId)) {
    return { ok: true, unchanged: true, participantIds: activity.participantIds }
  }
  return {
    ok: true,
    unchanged: false,
    participantIds: activity.participantIds.filter((id) => id !== userId),
  }
}

/** Organizer only: take a no-show (or anyone) out of the participant list. */
export function applyRemoveParticipant(
  activity: GroupActivity,
  organizerId: string,
  userId: string,
): GroupActivityJoinTransition {
  if (activity.organizerId !== organizerId) return { ok: false, reason: 'not-organizer' }
  if (!activity.participantIds.includes(userId)) {
    return { ok: true, unchanged: true, participantIds: activity.participantIds }
  }
  return {
    ok: true,
    unchanged: false,
    participantIds: activity.participantIds.filter((id) => id !== userId),
  }
}

/** Organizing or having joined counts toward the free-plan limits either way. */
export const isInvolvedInGroupActivity = (activity: GroupActivity, userId: string) =>
  activity.organizerId === userId || activity.participantIds.includes(userId)
