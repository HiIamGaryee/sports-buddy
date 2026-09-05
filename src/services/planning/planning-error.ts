/** Planning failure with a message that is safe to show a user. */
export class PlanningError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlanningError'
  }
}

export const PLANNING_ERROR_CODES = {
  notConnected: 'planning/not-connected',
  stale: 'planning/stale-proposal',
  missing: 'planning/missing-plan',
} as const

const MESSAGES: Record<string, string> = {
  [PLANNING_ERROR_CODES.notConnected]:
    'You can only plan a session with a sports buddy you are connected to.',
  [PLANNING_ERROR_CODES.stale]:
    'That suggestion changed while you were looking. Take another look.',
  [PLANNING_ERROR_CODES.missing]: 'This plan is unavailable.',
}

export const PLANNING_FALLBACK_MESSAGES = {
  load: "We couldn't load this plan.",
  update: "We couldn't update the plan. Please try again.",
} as const

export const planningError = (code: string) =>
  Object.assign(new Error(code), { code })

const getCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''

export function toPlanningError(
  error: unknown,
  fallback: string,
): PlanningError {
  const message = MESSAGES[getCode(error)]
  if (message) return new PlanningError(message)
  // A message the service authored itself (a validation failure) passes
  // through; anything else — including a raw provider error — does not.
  if (error instanceof PlanningError) return error
  return new PlanningError(fallback)
}
