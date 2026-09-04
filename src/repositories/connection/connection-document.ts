import type { DocumentData } from 'firebase/firestore'
import { Timestamp } from 'firebase/firestore'

import type { Connection, ConnectionStatus } from '@/types/connection'

const toIsoString = (value: unknown, fallback: string): string =>
  value instanceof Timestamp
    ? value.toDate().toISOString()
    : typeof value === 'string'
      ? value
      : fallback

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : []

/**
 * Firestore document → domain object, and the one place a malformed document
 * is rejected. Returns `null` rather than throwing, so one bad document can
 * never break a whole feed: exactly two distinct participants and at least
 * one requester who is a participant, or it does not exist to the app.
 */
export function toConnectionDocument(
  id: string,
  data: DocumentData,
): Connection | null {
  const participants = asStringArray(data.participants)
  if (participants.length !== 2) return null
  const [first, second] = participants
  if (first === second) return null

  const requestedBy = asStringArray(data.requestedBy).filter((userId) =>
    participants.includes(userId),
  )
  if (requestedBy.length === 0) return null

  const status: ConnectionStatus =
    data.status === 'connected' ? 'connected' : 'pending'
  const epoch = new Date(0).toISOString()
  const createdAt = toIsoString(data.createdAt, epoch)

  return {
    id,
    participants: [first, second],
    requestedBy: [...new Set(requestedBy)],
    status,
    createdAt,
    updatedAt: toIsoString(data.updatedAt, createdAt),
    connectedAt: data.connectedAt ? toIsoString(data.connectedAt, epoch) : null,
  }
}
