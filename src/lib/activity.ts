import { isValidCoordinate } from '@/lib/geo'
import { isProposalAgreed, isVenueAgreed, isPlanReady } from '@/lib/planning'
import type { ActivityPlan, PlannedTime } from '@/types/planning'
import type {
  ActivityStatus,
  ActivityTemporalState,
  CreateActivityInput,
} from '@/types/activity'

/**
 * Pure activity rules. No Firebase, no React — turning an agreed plan into a
 * stable event snapshot, and deciding whether that is allowed at all.
 */

/**
 * The confirmed activity's id IS its source plan's id, which is what makes
 * "one plan → at most one activity" a property of the database rather than
 * something the client has to be careful about. It also lets the security
 * rules read the plan in a single lookup.
 */
export const activityIdForPlan = (planId: string) => planId

/**
 * ONE definition of confirmable, shared by the UI, the service and (in its
 * own language) the security rules. All four proposals agreed by BOTH people,
 * and not already confirmed.
 */
export function canConfirmActivity(
  plan: ActivityPlan | null | undefined,
): plan is ActivityPlan {
  if (!plan) return false
  if (plan.status === 'confirmed') return false
  if (plan.participants.length !== 2) return false
  if (plan.participants[0] === plan.participants[1]) return false
  return isPlanReady(plan) && isVenueAgreed(plan)
}

/** A confirmed plan is a record of what happened, not an editable draft. */
export const isPlanLocked = (plan: ActivityPlan | null | undefined) =>
  plan?.status === 'confirmed'

/**
 * The offset of a named zone at a given instant, in milliseconds.
 * `Intl` is the only thing that knows a zone's rules, so it is asked rather
 * than a table of offsets being hardcoded anywhere.
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % 24,
    read('minute'),
    read('second'),
  )
  return asUtc - instant.getTime()
}

/**
 * The plan stores what the two people agreed in words — "12 Sep, 17:00, Asia/
 * Kuala_Lumpur". An activity needs a real instant, so it is resolved here,
 * once, at confirmation. `null` when the plan's time is unusable.
 *
 * Deliberately not `new Date(y, m, d, …)`: that would use whichever device
 * confirmed, so two people in different zones would disagree about when their
 * session is.
 */
export function resolvePlannedInstant(time: PlannedTime): Date | null {
  const [year, month, day] = time.date.split('-').map(Number)
  const [hours, minutes] = time.startTime.split(':').map(Number)
  if (![year, month, day, hours, minutes].every(Number.isFinite)) return null

  const zone = time.timeZone || 'UTC'
  const guess = Date.UTC(year, month - 1, day, hours, minutes)
  try {
    // One correction is exact wherever the offset does not change inside the
    // session (true for Malaysia, which has no DST).
    const resolved = new Date(guess - timeZoneOffsetMs(new Date(guess), zone))
    return Number.isNaN(resolved.getTime()) ? null : resolved
  } catch {
    // An unknown zone falls back to treating the wall time as UTC.
    return new Date(guess)
  }
}

function resolveRange(time: PlannedTime): { start: Date; end: Date } | null {
  const start = resolvePlannedInstant(time)
  const end = resolvePlannedInstant({ ...time, startTime: time.endTime })
  if (!start || !end || end.getTime() <= start.getTime()) return null
  return { start, end }
}

/**
 * Plan → the activity that will be written. `null` when anything required is
 * missing or malformed, so a broken activity is never persisted.
 *
 * Only agreed values are copied. No proposal history, no acceptance lists, no
 * profile data, no compatibility score.
 */
export function buildActivityFromPlan(
  plan: ActivityPlan,
  createdBy: string,
): CreateActivityInput | null {
  if (!canConfirmActivity(plan)) return null

  const sportId = plan.sportProposal.value
  const time = plan.timeProposal.value
  const budget = plan.budgetProposal.value
  const venue = plan.venueProposal.value
  if (!sportId || !time || !budget || !venue) return null

  const range = resolveRange(time)
  if (!range) return null

  if (!venue.placeId || !venue.name.trim() || !isValidCoordinate(venue.location)) {
    return null
  }
  if (!Number.isFinite(budget.min) || budget.min < 0) return null
  if (budget.max !== null && budget.max < budget.min) return null
  if (!plan.connectionId) return null

  return {
    id: activityIdForPlan(plan.id),
    sourcePlanId: plan.id,
    connectionId: plan.connectionId,
    participants: plan.participants,
    sportId,
    startAt: range.start.toISOString(),
    endAt: range.end.toISOString(),
    budget: {
      min: budget.min,
      max: budget.max,
      currency: 'MYR',
      unit: 'per-person',
    },
    venue,
    createdBy,
  }
}

/* ------------------------------------------------------------------ ORDER */

/** Soonest first — never creation order. Upcoming reads this way. */
export const compareByStart = (
  a: { startAt: string },
  b: { startAt: string },
) => a.startAt.localeCompare(b.startAt)

/** Most recently finished first. History reads this way. */
export const compareByEndDescending = (
  a: { endAt: string },
  b: { endAt: string },
) => b.endAt.localeCompare(a.endAt)

/* --------------------------------------------------------------- TEMPORAL */

/**
 * WHERE a confirmed activity sits on the timeline.
 *
 * `now` is INJECTED rather than read from the clock, which is what makes
 * every caller testable and keeps the rule in one place instead of a
 * `new Date()` scattered through the UI.
 *
 * The boundary is `endAt`, not `startAt`: a session in progress is still
 * something you are going to, so it stays `upcoming` until it ends. `now`
 * exactly equal to `endAt` is `past` — the session is over at its end time.
 *
 * `past` means the end time has passed and NOTHING else. It does not mean
 * anyone attended, that the session happened, or that it was completed.
 */
export function getActivityTemporalState(
  activity: { endAt: string },
  now: Date,
): ActivityTemporalState {
  const end = Date.parse(activity.endAt)
  // A corrupted timestamp is treated as upcoming rather than silently
  // vanishing into history where nobody would look for it.
  if (Number.isNaN(end)) return 'upcoming'
  return now.getTime() >= end ? 'past' : 'upcoming'
}

export const isActivityPast = (activity: { endAt: string }, now: Date) =>
  getActivityTemporalState(activity, now) === 'past'

/**
 * Started but not finished. A display refinement only — it is never persisted
 * and never changes which tab an activity belongs to.
 */
export function isActivityHappeningNow(
  activity: { startAt: string; endAt: string },
  now: Date,
): boolean {
  const start = Date.parse(activity.startAt)
  const end = Date.parse(activity.endAt)
  if (Number.isNaN(start) || Number.isNaN(end)) return false
  const time = now.getTime()
  return time >= start && time < end
}

/**
 * The soonest activity that has not finished. This is what Home shows, and
 * why it cannot surface yesterday's session: the filter is the clock, not a
 * stored status.
 */
export function getNextActivity<T extends { startAt: string; endAt: string }>(
  activities: readonly T[],
  now: Date,
): T | null {
  return (
    [...activities]
      .filter((activity) => !isActivityPast(activity, now))
      .sort(compareByStart)[0] ?? null
  )
}

/* ----------------------------------------------------------------- LEGACY */

/**
 * STEP 12 persisted `status: 'upcoming'`, mixing business state with time.
 * STEP 13 separates them: the document records only that the session is
 * `confirmed`, and upcoming/past is derived from `endAt`.
 *
 * Existing documents are normalized on READ so nobody has to migrate or
 * delete data. `cancelled` and `completed` were never produced by any code
 * path, so they normalize too rather than inventing a state the app cannot
 * render.
 */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars -- see below */
export const normalizeActivityStatus = (
  // Deliberately ignored: every value a document can hold today means the
  // same thing. The parameter stays so the ONE place that would need to
  // distinguish a future `cancelled` already exists and is already called.
  _status: unknown,
): ActivityStatus => 'confirmed'

/* ---------------------------------------------------------------- HISTORY */

const monthLabelFormat = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
})

/**
 * History grouped by the month a session took place, newest month first and
 * newest activity first inside each month.
 *
 * Pure, and separate from JSX so the page renders groups rather than building
 * them. The key is `YYYY-MM` so groups order without parsing their label.
 */
export function groupActivitiesByMonth<T extends { endAt: string }>(
  activities: readonly T[],
): { key: string; label: string; activities: T[] }[] {
  const groups = new Map<string, { label: string; activities: T[] }>()

  for (const activity of [...activities].sort(compareByEndDescending)) {
    const date = new Date(activity.endAt)
    if (Number.isNaN(date.getTime())) continue

    // Local month, matching the date the reader sees on the card.
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const group = groups.get(key)
    if (group) {
      group.activities.push(activity)
    } else {
      groups.set(key, { label: monthLabelFormat.format(date), activities: [activity] })
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, group]) => ({ key, ...group }))
}

export { isProposalAgreed }
