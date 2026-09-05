import type {
  BudgetPreference,
  SkillLevel,
  SportId,
} from '@/types/sports-profile'

/**
 * A collaborative value. Both participants must appear in `acceptedBy` before
 * it counts as agreed.
 *
 * `version` is what stops a stale screen agreeing to something that has since
 * changed: proposing bumps it and resets `acceptedBy` to the proposer, and an
 * accept must name the version it saw. `version: 0` means "nothing proposed
 * yet", so every proposal has the same shape from the moment a plan exists.
 */
export interface Proposal<T> {
  value: T | null
  /** `''` while `version` is 0. */
  proposedBy: string
  acceptedBy: string[]
  version: number
  updatedAt: string | null
}

/**
 * A real future slot, stored as a local calendar date + local wall-clock
 * times + the IANA zone they were chosen in. Deliberately not a UTC instant:
 * "Saturday 5pm" is what the two people agreed, and it should survive a
 * traveller crossing a timezone. Nothing hardcodes UTC+8.
 */
export interface PlannedTime {
  /** `YYYY-MM-DD` in `timeZone`. */
  date: string
  /** `HH:mm`, 24-hour, in `timeZone`. */
  startTime: string
  endTime: string
  /** IANA zone, e.g. `Asia/Kuala_Lumpur`. */
  timeZone: string
}

/** `draft` while anything is still unagreed; `ready` once all three are. */
export type PlanStatus = 'draft' | 'ready'

/** The three things STEP 10 answers: what, when, how much. Venue is STEP 11. */
export type ProposalKind = 'sport' | 'time' | 'budget'

export interface ActivityPlan {
  id: string
  connectionId: string
  participants: [string, string]
  status: PlanStatus
  sportProposal: Proposal<SportId>
  timeProposal: Proposal<PlannedTime>
  budgetProposal: Proposal<BudgetPreference>
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** A sport both people actually listed, with each side's level. */
export interface SharedSportOption {
  sportId: SportId
  mySkillLevel: SkillLevel
  theirSkillLevel: SkillLevel
}

/** A concrete upcoming date derived from a shared recurring availability slot. */
export interface SuggestedSlot {
  /** `YYYY-MM-DD`. */
  date: string
  day: import('@/types/sports-profile').WeekDay
  period: import('@/types/sports-profile').DayPeriod
  startTime: string
  endTime: string
}
