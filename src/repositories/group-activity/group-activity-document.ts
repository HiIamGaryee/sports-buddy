import type { DocumentData } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

import { AREAS } from '@/constants/areas'
import { SPORTS } from '@/constants/sports'
import { isSkillPreference } from '@/lib/group-activity'
import type { GroupActivity } from '@/types/group-activity'
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
 * Firestore document → domain object, and the one place a malformed activity
 * is rejected. Another member wrote this document, so nothing about it is
 * trusted: `null` for anything unexpected, so one bad document can never
 * break the whole Discover list.
 */
export function toGroupActivityDocument(id: string, data: DocumentData): GroupActivity | null {
  const startAt = toIsoOrNull(data.startAt)
  const budget = data.budget as Record<string, unknown> | undefined

  if (
    typeof data.organizerId !== 'string' ||
    !isSportId(data.sportId) ||
    !isAreaId(data.areaId) ||
    typeof data.title !== 'string' ||
    data.title.length === 0 ||
    typeof data.venueName !== 'string' ||
    data.venueName.length === 0 ||
    typeof data.timeZone !== 'string' ||
    !startAt ||
    !budget ||
    !isFiniteNumber(budget.min) ||
    !(budget.max === null || isFiniteNumber(budget.max)) ||
    !isFiniteNumber(data.maxParticipants) ||
    data.maxParticipants < 1
  ) {
    return null
  }

  return {
    id,
    organizerId: data.organizerId,
    sportId: data.sportId,
    title: data.title,
    description: typeof data.description === 'string' ? data.description : '',
    startAt,
    endAt: toIsoOrNull(data.endAt),
    timeZone: data.timeZone,
    areaId: data.areaId,
    venueName: data.venueName,
    budget: { min: budget.min, max: budget.max },
    preferredSkillLevel: isSkillPreference(data.preferredSkillLevel)
      ? data.preferredSkillLevel
      : 'any',
    maxParticipants: data.maxParticipants,
    participantIds: asIdList(data.participantIds),
    createdAt: toIsoOrNull(data.createdAt),
    updatedAt: toIsoOrNull(data.updatedAt),
  }
}
