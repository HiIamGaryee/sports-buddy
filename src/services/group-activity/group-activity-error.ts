/** Why a join-related write was refused, so the service can say it plainly. */
export const GROUP_ACTIVITY_ERROR_CODES = {
  missing: 'group-activity/missing',
  full: 'group-activity/full',
  started: 'group-activity/started',
  isOrganizer: 'group-activity/is-organizer',
  notOrganizer: 'group-activity/not-organizer',
  hostLimit: 'group-activity/host-limit',
  joinLimit: 'group-activity/join-limit',
} as const

type GroupActivityErrorCode =
  (typeof GROUP_ACTIVITY_ERROR_CODES)[keyof typeof GROUP_ACTIVITY_ERROR_CODES]

export class GroupActivityError extends Error {
  readonly code: GroupActivityErrorCode

  constructor(code: GroupActivityErrorCode) {
    super(code)
    this.code = code
    this.name = 'GroupActivityError'
  }
}

export const groupActivityError = (code: GroupActivityErrorCode) =>
  new GroupActivityError(code)

const MESSAGES: Record<GroupActivityErrorCode, string> = {
  [GROUP_ACTIVITY_ERROR_CODES.missing]: 'This activity is no longer available.',
  [GROUP_ACTIVITY_ERROR_CODES.full]: 'This activity is already full.',
  [GROUP_ACTIVITY_ERROR_CODES.started]: 'This activity has already started.',
  [GROUP_ACTIVITY_ERROR_CODES.isOrganizer]: "You're already hosting this activity.",
  [GROUP_ACTIVITY_ERROR_CODES.notOrganizer]:
    'Only the person who created this activity can do that.',
  [GROUP_ACTIVITY_ERROR_CODES.hostLimit]:
    "Free accounts can host 2 active activities at once. Get Buddy+ for unlimited hosting, or wrap up an activity to free a slot.",
  [GROUP_ACTIVITY_ERROR_CODES.joinLimit]:
    "Free accounts can join 3 upcoming activities at once. Get Buddy+ for unlimited activities, or leave one to free a slot.",
}

/** A known refusal becomes its own sentence; anything else, the fallback. */
export const toGroupActivityMessage = (error: unknown, fallback: string) =>
  error instanceof GroupActivityError ? MESSAGES[error.code] : fallback

const REFUSAL_CODES = {
  full: GROUP_ACTIVITY_ERROR_CODES.full,
  started: GROUP_ACTIVITY_ERROR_CODES.started,
  'is-organizer': GROUP_ACTIVITY_ERROR_CODES.isOrganizer,
  'not-organizer': GROUP_ACTIVITY_ERROR_CODES.notOrganizer,
} as const satisfies Record<
  import('@/lib/group-activity').GroupActivityRefusal,
  GroupActivityErrorCode
>

/** A pure refusal from `lib/group-activity` → a typed error to throw. */
export const refusalError = (reason: import('@/lib/group-activity').GroupActivityRefusal) =>
  groupActivityError(REFUSAL_CODES[reason])
