import type { DayPeriod } from '@/types/sports-profile'

/**
 * Every planning threshold lives here. Sports, budgets, days and periods all
 * still come from `src/constants/sports.ts` and `profile-options.ts` — this
 * file only adds what planning itself introduces.
 */

/**
 * Profile availability is recurring and coarse ("Saturday evening"), so the
 * planner needs a concrete window to seed a real start/end time from. These
 * are suggestions the user can edit, never a constraint.
 */
export const PERIOD_TIME_WINDOWS = {
  morning: { startTime: '08:00', endTime: '12:00' },
  afternoon: { startTime: '12:00', endTime: '17:00' },
  evening: { startTime: '17:00', endTime: '21:00' },
} as const satisfies Record<DayPeriod, { startTime: string; endTime: string }>

/** The default length a suggestion proposes inside its window. */
export const DEFAULT_SESSION_MINUTES = 120

/** Anything shorter is not a session. */
export const MIN_SESSION_MINUTES = 30

/** How many concrete upcoming dates a shared slot offers. */
export const SUGGESTED_DATES_PER_SLOT = 3

/** How far ahead suggestions may reach, so the list stays finite. */
export const SUGGESTION_HORIZON_DAYS = 28

export const PLAN_STEPS = [
  { kind: 'sport', label: 'Sport', question: 'What are you playing?' },
  { kind: 'time', label: 'Time', question: 'When are you both free?' },
  { kind: 'budget', label: 'Budget', question: 'What will it cost each?' },
  { kind: 'venue', label: 'Venue', question: 'Where should you play?' },
] as const

/** The three that must be agreed before a venue can be chosen. */
export const CORE_PLAN_STEPS = PLAN_STEPS.filter(
  (step) => step.kind !== 'venue',
)
