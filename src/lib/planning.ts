import { getSharedAvailability } from '@/lib/availability'
import { getSharedBudget } from '@/lib/budget'
import { getConnectionState } from '@/lib/connection'
import { WEEK_DAYS } from '@/constants/profile-options'
import {
  DEFAULT_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  PERIOD_TIME_WINDOWS,
  SUGGESTED_DATES_PER_SLOT,
  SUGGESTION_HORIZON_DAYS,
} from '@/constants/planning'
import type { Connection } from '@/types/connection'
import type {
  ActivityPlan,
  PlannedTime,
  Proposal,
  ProposalKind,
  SharedSportOption,
  SuggestedSlot,
} from '@/types/planning'
import type {
  AvailabilitySlot,
  BudgetPreference,
  SportId,
  UserSport,
} from '@/types/sports-profile'

/**
 * Pure planning rules. No Firebase, no storage, no React, no `Date.now()`
 * except where a caller passes the clock in — so every suggestion and every
 * readiness decision is reproducible and testable.
 */

/**
 * A connection is the permission to plan, exactly as it is the permission to
 * chat. This asks STEP 8's rule rather than re-deriving it.
 */
export const canPlanTogether = (
  connection: Connection | null | undefined,
  currentUserId: string,
) => getConnectionState(connection, currentUserId) === 'connected'

/**
 * Sports BOTH people listed, with each side's level, in the viewer's own
 * order. The planner only ever offers these — proposing a sport the other
 * person does not play is not a plan, it is a surprise.
 *
 * The matching engine has its own shared-sport helper: that one is ordered by
 * discovery preference for scoring, this one carries the skill levels the
 * planner shows. Different questions, deliberately separate.
 */
export function getSharedSportOptions(
  mine: readonly UserSport[],
  theirs: readonly UserSport[],
): SharedSportOption[] {
  return mine.flatMap((sport) => {
    const match = theirs.find((entry) => entry.sportId === sport.sportId)
    return match
      ? [
          {
            sportId: sport.sportId,
            mySkillLevel: sport.skillLevel,
            theirSkillLevel: match.skillLevel,
          },
        ]
      : []
  })
}

/** Re-exported so planning code has one obvious import for both halves. */
export { getSharedAvailability as getSharedAvailabilitySlots }

const pad = (value: number) => String(value).padStart(2, '0')

/** Local calendar date, never a UTC instant — `YYYY-MM-DD`. */
export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

const toTime = (totalMinutes: number) =>
  `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`

const WEEK_DAY_INDEX = WEEK_DAYS.map(({ id }) => id)

/**
 * Turns recurring availability ("Saturday evening") into REAL upcoming dates.
 * Nothing is hardcoded: it walks forward from `from` day by day, so the
 * suggestions are always in the future and always correct for the actual
 * calendar.
 *
 * Ordered by date, so two people looking at the same plan see the same list.
 */
export function getUpcomingDatesForAvailability(
  shared: readonly AvailabilitySlot[],
  from: Date,
  perSlot = SUGGESTED_DATES_PER_SLOT,
): SuggestedSlot[] {
  if (shared.length === 0) return []

  const suggestions: SuggestedSlot[] = []
  const counts = new Map<string, number>()
  const cursor = new Date(from)
  cursor.setHours(0, 0, 0, 0)

  for (let offset = 0; offset <= SUGGESTION_HORIZON_DAYS; offset += 1) {
    const date = new Date(cursor)
    date.setDate(date.getDate() + offset)
    // `getDay()` is Sunday-first; WEEK_DAYS is Monday-first.
    const day = WEEK_DAY_INDEX[(date.getDay() + 6) % 7]
    const slot = shared.find((entry) => entry.day === day)
    if (!slot) continue

    for (const period of slot.periods) {
      const key = `${day}-${period}`
      if ((counts.get(key) ?? 0) >= perSlot) continue
      counts.set(key, (counts.get(key) ?? 0) + 1)

      const window = PERIOD_TIME_WINDOWS[period]
      const start = minutesOf(window.startTime)
      const end = Math.min(
        start + DEFAULT_SESSION_MINUTES,
        minutesOf(window.endTime),
      )
      suggestions.push({
        date: toDateKey(date),
        day,
        period,
        startTime: window.startTime,
        endTime: toTime(end),
      })
    }
  }

  return suggestions
}

/** The device's own zone. Never a hardcoded offset. */
export const getLocalTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * `null` when the slot is usable, otherwise a message safe to show. Rejects
 * the past, a zero or reversed range, and anything too short to be a session.
 */
export function getTimeRangeError(
  time: PlannedTime,
  now: Date,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(time.date)) return 'Pick a date.'
  if (!/^\d{2}:\d{2}$/.test(time.startTime) || !/^\d{2}:\d{2}$/.test(time.endTime)) {
    return 'Pick a start and end time.'
  }

  const start = minutesOf(time.startTime)
  const end = minutesOf(time.endTime)
  if (end <= start) return 'The end time has to be after the start time.'
  if (end - start < MIN_SESSION_MINUTES) {
    return `Give yourselves at least ${MIN_SESSION_MINUTES} minutes.`
  }

  const today = toDateKey(now)
  if (time.date < today) return 'Pick a date in the future.'
  if (time.date === today && start <= now.getHours() * 60 + now.getMinutes()) {
    return 'That start time has already passed today.'
  }

  return null
}

/** The suggested session budget from two profile ranges — may be `null`. */
export const getSuggestedBudget = getSharedBudget

/** A fresh, untouched proposal. Version 0 means "nobody has proposed yet". */
export const createEmptyProposal = <T>(): Proposal<T> => ({
  value: null,
  proposedBy: '',
  acceptedBy: [],
  version: 0,
  updatedAt: null,
})

/** The three untouched proposals a new plan starts with. */
export const createEmptyProposals = () => ({
  sportProposal: createEmptyProposal<SportId>(),
  timeProposal: createEmptyProposal<PlannedTime>(),
  budgetProposal: createEmptyProposal<BudgetPreference>(),
})

/** A brand new draft. Both repositories build their document from this. */
export const createEmptyPlan = (input: {
  id: string
  connectionId: string
  participants: [string, string]
  createdBy: string
  at: string
}): ActivityPlan => ({
  id: input.id,
  connectionId: input.connectionId,
  participants: input.participants,
  status: 'draft',
  ...createEmptyProposals(),
  createdBy: input.createdBy,
  createdAt: input.at,
  updatedAt: input.at,
})

export const isProposalAgreed = <T>(
  proposal: Proposal<T>,
  participants: readonly string[],
) =>
  proposal.version > 0 &&
  proposal.value !== null &&
  participants.every((participant) => proposal.acceptedBy.includes(participant))

/**
 * Ready means AGREED, not merely filled in: all three proposals carry a value
 * that both participants have accepted at its current version.
 */
export const isPlanReady = (plan: ActivityPlan) =>
  isProposalAgreed(plan.sportProposal, plan.participants) &&
  isProposalAgreed(plan.timeProposal, plan.participants) &&
  isProposalAgreed(plan.budgetProposal, plan.participants)

/** Domain key per proposal kind — the one mapping, used by every layer. */
export const PROPOSAL_KEYS = {
  sport: 'sportProposal',
  time: 'timeProposal',
  budget: 'budgetProposal',
} as const satisfies Record<ProposalKind, keyof ActivityPlan>

export const getProposal = (plan: ActivityPlan, kind: ProposalKind) =>
  plan[PROPOSAL_KEYS[kind]] as Proposal<unknown>

/** Flat shapes only, so structural equality is enough to spot a no-op. */
const isSameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

const withStatus = (plan: ActivityPlan, at: string): ActivityPlan => ({
  ...plan,
  status: isPlanReady(plan) ? 'ready' : 'draft',
  updatedAt: at,
})

/**
 * Replace one proposal. The proposer accepts implicitly, the version bumps
 * and the other person's earlier agreement is dropped — nobody should be
 * shown as having agreed to a value that has since changed.
 *
 * Idempotent: re-proposing the identical value changes nothing, so a double
 * tap cannot invalidate the other person's acceptance.
 */
export function applyProposal(
  plan: ActivityPlan,
  kind: ProposalKind,
  value: unknown,
  proposedBy: string,
  at: string,
): ActivityPlan {
  const key = PROPOSAL_KEYS[kind]
  const current = getProposal(plan, kind)

  if (
    current.version > 0 &&
    isSameValue(current.value, value) &&
    current.acceptedBy.includes(proposedBy)
  ) {
    return plan
  }

  const next: Proposal<unknown> = {
    value,
    proposedBy,
    acceptedBy: [proposedBy],
    version: current.version + 1,
    updatedAt: at,
  }
  return withStatus({ ...plan, [key]: next } as ActivityPlan, at)
}

/** A stale screen must not agree to something that has since been replaced. */
export const isAcceptStale = (
  plan: ActivityPlan,
  kind: ProposalKind,
  version: number,
) => getProposal(plan, kind).version !== version

/**
 * Add the caller — and only the caller — to a proposal's acceptance.
 * Idempotent, and it can never touch the other participant's entry.
 */
export function applyAcceptance(
  plan: ActivityPlan,
  kind: ProposalKind,
  userId: string,
  at: string,
): ActivityPlan {
  const key = PROPOSAL_KEYS[kind]
  const current = getProposal(plan, kind)
  if (current.acceptedBy.includes(userId)) return plan

  const next: Proposal<unknown> = {
    ...current,
    acceptedBy: [...current.acceptedBy, userId],
    updatedAt: at,
  }
  return withStatus({ ...plan, [key]: next } as ActivityPlan, at)
}

/** What the other person still owes, from the viewer's side. */
export type ProposalState =
  | 'empty'
  | 'agreed'
  | 'waiting-for-them'
  | 'needs-your-response'

export function getProposalState<T>(
  proposal: Proposal<T>,
  participants: readonly string[],
  currentUserId: string,
): ProposalState {
  if (proposal.version === 0 || proposal.value === null) return 'empty'
  if (isProposalAgreed(proposal, participants)) return 'agreed'
  return proposal.acceptedBy.includes(currentUserId)
    ? 'waiting-for-them'
    : 'needs-your-response'
}
