import type { DocumentData } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

import { createEmptyProposal } from '@/lib/planning'
import type {
  ActivityPlan,
  PlanStatus,
  PlannedTime,
  Proposal,
} from '@/types/planning'
import type { BudgetPreference, SportId } from '@/types/sports-profile'

const toIsoOrNull = (value: unknown): string | null =>
  value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === 'string'
      ? value
      : null

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : []

function toProposal<T>(
  raw: unknown,
  readValue: (value: unknown) => T | null,
): Proposal<T> {
  if (!raw || typeof raw !== 'object') return createEmptyProposal<T>()
  const data = raw as Record<string, unknown>
  const version = typeof data.version === 'number' ? data.version : 0

  return {
    value: version > 0 ? readValue(data.value) : null,
    proposedBy: asString(data.proposedBy),
    acceptedBy: [...new Set(asStringArray(data.acceptedBy))],
    version,
    updatedAt: toIsoOrNull(data.updatedAt),
  }
}

const readSport = (value: unknown): SportId | null =>
  typeof value === 'string' ? (value as SportId) : null

const readTime = (value: unknown): PlannedTime | null => {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (
    typeof data.date !== 'string' ||
    typeof data.startTime !== 'string' ||
    typeof data.endTime !== 'string'
  ) {
    return null
  }
  return {
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    timeZone: asString(data.timeZone, 'UTC'),
  }
}

const readBudget = (value: unknown): BudgetPreference | null => {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (typeof data.min !== 'number') return null
  return { min: data.min, max: typeof data.max === 'number' ? data.max : null }
}

/**
 * Firestore document → domain object, and the only place a malformed plan is
 * rejected. `null` rather than a throw, so one bad document cannot break a
 * conversation screen.
 */
export function toActivityPlanDocument(
  id: string,
  data: DocumentData,
): ActivityPlan | null {
  const participants = asStringArray(data.participants)
  if (participants.length !== 2) return null
  const [first, second] = participants
  if (first === second) return null

  const connectionId = asString(data.connectionId)
  if (!connectionId) return null

  const epoch = new Date(0).toISOString()
  const createdAt = toIsoOrNull(data.createdAt) ?? epoch

  return {
    id,
    connectionId,
    participants: [first, second],
    status: data.status === 'ready' ? 'ready' : ('draft' satisfies PlanStatus),
    sportProposal: toProposal(data.sportProposal, readSport),
    timeProposal: toProposal(data.timeProposal, readTime),
    budgetProposal: toProposal(data.budgetProposal, readBudget),
    createdBy: asString(data.createdBy),
    createdAt,
    updatedAt: toIsoOrNull(data.updatedAt) ?? createdAt,
  }
}
