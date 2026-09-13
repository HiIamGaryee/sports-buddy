/** Why a join-related write was refused, so the service can say it plainly. */
export const ACTIVITY_POST_ERROR_CODES = {
  missing: 'activity-post/missing',
  notInvited: 'activity-post/not-invited',
  full: 'activity-post/full',
  started: 'activity-post/started',
  ownPost: 'activity-post/own-post',
  notAuthor: 'activity-post/not-author',
  notPending: 'activity-post/not-pending',
} as const

type ActivityPostErrorCode =
  (typeof ACTIVITY_POST_ERROR_CODES)[keyof typeof ACTIVITY_POST_ERROR_CODES]

export class ActivityPostError extends Error {
  readonly code: ActivityPostErrorCode

  constructor(code: ActivityPostErrorCode) {
    super(code)
    this.code = code
    this.name = 'ActivityPostError'
  }
}

export const activityPostError = (code: ActivityPostErrorCode) =>
  new ActivityPostError(code)

const MESSAGES: Record<ActivityPostErrorCode, string> = {
  [ACTIVITY_POST_ERROR_CODES.missing]: 'This activity is no longer available.',
  [ACTIVITY_POST_ERROR_CODES.notInvited]: 'This activity is unavailable.',
  [ACTIVITY_POST_ERROR_CODES.full]: 'This activity is already full.',
  [ACTIVITY_POST_ERROR_CODES.started]: 'This activity has already started.',
  [ACTIVITY_POST_ERROR_CODES.ownPost]: "You can't join your own activity.",
  [ACTIVITY_POST_ERROR_CODES.notAuthor]:
    'Only the person who posted this activity can do that.',
  [ACTIVITY_POST_ERROR_CODES.notPending]: 'That request is no longer waiting.',
}

/** A known refusal becomes its own sentence; anything else, the fallback. */
export const toActivityPostMessage = (error: unknown, fallback: string) =>
  error instanceof ActivityPostError ? MESSAGES[error.code] : fallback

const REFUSAL_CODES = {
  'not-invited': ACTIVITY_POST_ERROR_CODES.notInvited,
  full: ACTIVITY_POST_ERROR_CODES.full,
  started: ACTIVITY_POST_ERROR_CODES.started,
  'own-post': ACTIVITY_POST_ERROR_CODES.ownPost,
  'not-author': ACTIVITY_POST_ERROR_CODES.notAuthor,
  'not-pending': ACTIVITY_POST_ERROR_CODES.notPending,
} as const satisfies Record<
  import('@/lib/activity-post').JoinRefusal,
  ActivityPostErrorCode
>

/** A pure refusal from `lib/activity-post` → a typed error to throw. */
export const refusalError = (
  reason: import('@/lib/activity-post').JoinRefusal,
) => activityPostError(REFUSAL_CODES[reason])
