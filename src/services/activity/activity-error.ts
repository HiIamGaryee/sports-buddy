/** Activity failure with a message that is safe to show a user. */
export class ActivityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActivityError'
  }
}

export const ACTIVITY_ERROR_CODES = {
  notConfirmable: 'activity/not-confirmable',
  missingPlan: 'activity/missing-plan',
  notParticipant: 'activity/not-participant',
  invalid: 'activity/invalid',
} as const

const MESSAGES: Record<string, string> = {
  [ACTIVITY_ERROR_CODES.notConfirmable]:
    'Agree the sport, time, budget and venue before confirming.',
  [ACTIVITY_ERROR_CODES.missingPlan]: 'This plan is unavailable.',
  [ACTIVITY_ERROR_CODES.notParticipant]:
    'You can only confirm an activity you are part of.',
  [ACTIVITY_ERROR_CODES.invalid]:
    "This plan is missing something, so it couldn't be confirmed.",
}

export const ACTIVITY_FALLBACK_MESSAGES = {
  confirm: "We couldn't confirm this activity. Please try again.",
  load: "We couldn't load your activities.",
  detail: 'This activity is unavailable.',
} as const

export const activityError = (code: string) =>
  Object.assign(new Error(code), { code })

const getCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''

export function toActivityError(
  error: unknown,
  fallback: string,
): ActivityError {
  const message = MESSAGES[getCode(error)]
  if (message) return new ActivityError(message)
  // A message the service authored itself passes through; a provider error
  // never does.
  if (error instanceof ActivityError) return error
  return new ActivityError(fallback)
}
