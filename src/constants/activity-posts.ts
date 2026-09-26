/** Longest venue name a post accepts. Mirrored in `firestore.rules`. */
export const MAX_VENUE_NAME_LENGTH = 80

/** How far ahead a post may be scheduled. Mirrored in `firestore.rules`. */
export const MAX_POST_HORIZON_DAYS = 90

/** Shortest and longest a 1v1 session may run. Mirrored in `firestore.rules`. */
export const MIN_POST_DURATION_MINUTES = 30
export const MAX_POST_DURATION_HOURS = 12

/** The end time suggested when a start is picked: a two-hour session. */
export const DEFAULT_POST_DURATION_MINUTES = 120

/** One batch of upcoming posts for Discover — no infinite scroll. */
export const ACTIVITY_POST_BATCH_LIMIT = 30

/** Highest RM amount a posted budget may state. Mirrored in `firestore.rules`. */
export const MAX_POST_BUDGET_RM = 10_000

/** A 1v1 session has one spot. Mirrored in `firestore.rules`. */
export const ACTIVITY_POST_CAPACITY = 1

/** Most people who may wait on one post's approval. Mirrored in the rules. */
export const MAX_PENDING_JOIN_REQUESTS = 20

/** The author's choice on the post form, in display order. */
export const JOIN_POLICY_OPTIONS = [
  {
    id: 'open',
    label: 'Anyone can join',
    description: 'The first person to tap Join gets the spot.',
  },
  {
    id: 'approval',
    label: 'I approve who joins',
    description: 'People send a request; you choose who gets the spot.',
  },
] as const satisfies readonly {
  id: import('@/types/activity-post').JoinPolicy
  label: string
  description: string
}[]

/** The author's choice for a post they share themselves (not an invite). */
export const VISIBILITY_OPTIONS = [
  {
    id: 'public',
    label: 'Public',
    description: 'Shown on Discover, and anyone with the link can open it.',
  },
  {
    id: 'link',
    label: 'Link only',
    description: 'Hidden from Discover. Only people you send the link to can find it.',
  },
] as const satisfies readonly {
  id: Exclude<import('@/types/activity-post').PostVisibility, 'invite'>
  label: string
  description: string
}[]
