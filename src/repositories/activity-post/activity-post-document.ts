import type { DocumentData } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

import { ACTIVITY_POST_CAPACITY } from '@/constants/activity-posts'
import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import type { ActivityPost } from '@/types/activity-post'
import type { AreaId, SportId } from '@/types/sports-profile'

const isSportId = (value: unknown): value is SportId =>
  SPORTS.some((sport) => sport.id === value)

const isAreaId = (value: unknown): value is AreaId =>
  AREAS.some((area) => area.id === value)

const toIsoOrNull = (value: unknown): string | null =>
  value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === 'string'
      ? value
      : null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const asIdList = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === 'string'))]
    : []

/**
 * Firestore document → domain object, and the one place a malformed post is
 * rejected. Another member wrote this document, so nothing about it is
 * trusted: `null` for anything unexpected, so one bad post can never break
 * the whole Discover list.
 */
export function toActivityPostDocument(
  id: string,
  data: DocumentData,
): ActivityPost | null {
  const startAt = toIsoOrNull(data.startAt)
  const budget = data.budget as Record<string, unknown> | undefined

  if (
    typeof data.authorId !== 'string' ||
    !isSportId(data.sportId) ||
    !isAreaId(data.areaId) ||
    typeof data.venueName !== 'string' ||
    data.venueName.length === 0 ||
    typeof data.timeZone !== 'string' ||
    !startAt ||
    !budget ||
    !isFiniteNumber(budget.min) ||
    !(budget.max === null || isFiniteNumber(budget.max))
  ) {
    return null
  }

  return {
    id,
    authorId: data.authorId,
    sportId: data.sportId,
    startAt,
    // `null` for a post written before end times existed.
    endAt: toIsoOrNull(data.endAt),
    timeZone: data.timeZone,
    areaId: data.areaId,
    venueName: data.venueName,
    budget: { min: budget.min, max: budget.max },
    // A post written before joins existed reads as open, one spot, empty —
    // the same defaults the rules use, so nothing had to be migrated.
    joinPolicy: data.joinPolicy === 'approval' ? 'approval' : 'open',
    visibility:
      data.visibility === 'link' || data.visibility === 'invite'
        ? data.visibility
        : 'public',
    invitedId:
      data.visibility === 'invite' && typeof data.invitedId === 'string'
        ? data.invitedId
        : null,
    capacity: isFiniteNumber(data.capacity) && data.capacity >= 1
      ? data.capacity
      : ACTIVITY_POST_CAPACITY,
    joinedIds: asIdList(data.joinedIds),
    pendingIds: asIdList(data.pendingIds),
    createdAt: toIsoOrNull(data.createdAt),
    updatedAt: toIsoOrNull(data.updatedAt),
  }
}
