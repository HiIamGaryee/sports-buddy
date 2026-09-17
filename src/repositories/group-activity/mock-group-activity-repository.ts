import { MOCK_STORAGE_KEYS } from '@/constants/app'
import {
  applyJoinGroupActivity,
  applyLeaveGroupActivity,
  applyRemoveParticipant,
  compareGroupActivities,
  isUpcomingGroupActivity,
  type GroupActivityJoinTransition,
} from '@/lib/group-activity'
import { delay, readStoreArray, writeStore } from '@/repositories/mock-store'
import {
  GROUP_ACTIVITY_ERROR_CODES,
  groupActivityError,
  refusalError,
} from '@/services/group-activity/group-activity-error'
import type { GroupActivityRepository } from '@/repositories/group-activity/group-activity-repository'
import type { GroupActivity } from '@/types/group-activity'

const isGroupActivity = (value: unknown): value is GroupActivity => {
  if (!value || typeof value !== 'object') return false
  const activity = value as Record<string, unknown>
  return (
    typeof activity.id === 'string' &&
    typeof activity.organizerId === 'string' &&
    typeof activity.sportId === 'string' &&
    typeof activity.title === 'string' &&
    typeof activity.startAt === 'string' &&
    typeof activity.areaId === 'string' &&
    typeof activity.venueName === 'string' &&
    !!activity.budget &&
    typeof activity.budget === 'object'
  )
}

const asIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

const normalize = (activity: GroupActivity): GroupActivity => ({
  ...activity,
  description: activity.description ?? '',
  endAt: activity.endAt ?? null,
  preferredSkillLevel: activity.preferredSkillLevel ?? 'any',
  maxParticipants:
    typeof activity.maxParticipants === 'number' && activity.maxParticipants >= 1
      ? activity.maxParticipants
      : 2,
  participantIds: asIds(activity.participantIds),
  updatedAt: activity.updatedAt ?? null,
})

const read = () =>
  readStoreArray<GroupActivity>(MOCK_STORAGE_KEYS.groupActivities, isGroupActivity).map(normalize)

const write = (activities: GroupActivity[]) =>
  writeStore(MOCK_STORAGE_KEYS.groupActivities, activities)

async function transitionParticipants(
  activityId: string,
  transition: (activity: GroupActivity) => GroupActivityJoinTransition,
): Promise<GroupActivity> {
  await delay(null, 150)
  const activities = read()
  const activity = activities.find((entry) => entry.id === activityId)
  if (!activity) throw groupActivityError(GROUP_ACTIVITY_ERROR_CODES.missing)

  const next = transition(activity)
  if (!next.ok) throw refusalError(next.reason)
  if (next.unchanged) return activity

  const updated = { ...activity, participantIds: next.participantIds }
  write(activities.map((entry) => (entry.id === activityId ? updated : entry)))
  return updated
}

let nextId = 0

/** localStorage-backed, with the same ordering, limits and transitions as Firestore. */
export const mockGroupActivityRepository: GroupActivityRepository = {
  async listUpcoming(now, limit) {
    return delay(
      read()
        .filter((activity) => isUpcomingGroupActivity(activity, now))
        .sort(compareGroupActivities)
        .slice(0, limit),
    )
  },

  async listByOrganizer(organizerId, limit) {
    return delay(
      read()
        .filter((activity) => activity.organizerId === organizerId)
        .slice(0, limit),
    )
  },

  async listJoinedBy(userId, limit) {
    return delay(
      read()
        .filter((activity) => activity.participantIds.includes(userId))
        .slice(0, limit),
    )
  },

  async getById(activityId) {
    return delay(read().find((activity) => activity.id === activityId) ?? null)
  },

  async create(input) {
    nextId += 1
    const activity: GroupActivity = {
      id: `mock_group_activity_${Date.now()}_${nextId}`,
      organizerId: input.organizerId,
      sportId: input.sportId,
      title: input.title,
      description: input.description,
      startAt: input.startAt,
      endAt: input.endAt,
      timeZone: input.timeZone,
      areaId: input.areaId,
      venueName: input.venueName,
      budget: { min: input.budget.min, max: input.budget.max },
      preferredSkillLevel: input.preferredSkillLevel,
      maxParticipants: input.maxParticipants,
      participantIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: null,
    }
    write([...read(), activity])
    return delay(activity)
  },

  async update(activityId, input) {
    const activities = read()
    const existing = activities.find((activity) => activity.id === activityId)
    if (!existing || existing.organizerId !== input.organizerId) {
      throw groupActivityError(GROUP_ACTIVITY_ERROR_CODES.notOrganizer)
    }
    write(
      activities.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              sportId: input.sportId,
              title: input.title,
              description: input.description,
              startAt: input.startAt,
              endAt: input.endAt,
              timeZone: input.timeZone,
              areaId: input.areaId,
              venueName: input.venueName,
              budget: { min: input.budget.min, max: input.budget.max },
              preferredSkillLevel: input.preferredSkillLevel,
              maxParticipants: input.maxParticipants,
              updatedAt: new Date().toISOString(),
            }
          : activity,
      ),
    )
    await delay(null)
  },

  async remove(activityId) {
    write(read().filter((activity) => activity.id !== activityId))
    await delay(null)
  },

  join(activityId, userId) {
    return transitionParticipants(activityId, (activity) =>
      applyJoinGroupActivity(activity, userId, new Date()),
    )
  },

  async leave(activityId, userId) {
    await transitionParticipants(activityId, (activity) =>
      applyLeaveGroupActivity(activity, userId),
    )
  },

  async removeParticipant(activityId, organizerId, userId) {
    await transitionParticipants(activityId, (activity) =>
      applyRemoveParticipant(activity, organizerId, userId),
    )
  },
}
