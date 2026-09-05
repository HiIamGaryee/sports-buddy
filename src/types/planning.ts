import type {
  BudgetPreference,
  SkillLevel,
  SportId,
} from '@/types/sports-profile'
import type { VenueSelection } from '@/types/venue'

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

/**
 * `ready` kept its STEP 10 name deliberately — no data migration — but now
 * means "ready for a venue": sport, time and budget agreed, venue still open.
 *
 *   draft         something among sport/time/budget is still unagreed
 *   ready         those three agreed, no venue yet
 *   venue-agreed  all four agreed; STEP 12 turns this into an activity
 */
export type PlanStatus = 'draft' | 'ready' | 'venue-agreed'

/** The four things a plan answers: what, when, how much, where. */
export type ProposalKind = 'sport' | 'time' | 'budget' | 'venue'

export interface ActivityPlan {
  id: string
  connectionId: string
  participants: [string, string]
  status: PlanStatus
  sportProposal: Proposal<SportId>
  timeProposal: Proposal<PlannedTime>
  budgetProposal: Proposal<BudgetPreference>
  /**
   * STEP 11. Plans created before it exist without this field; the document
   * mapper and the mock normalizer fill in an empty proposal on read.
   */
  venueProposal: Proposal<VenueSelection>
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
