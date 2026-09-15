import { AREAS } from '@/constants/areas'
import {
  ACTIVITY_INTENSITIES,
  BUDGET_OPTIONS,
  DAY_PERIODS,
  SKILL_LEVELS,
  SPORTS_INTENTS,
  WEEK_DAYS,
} from '@/constants/profile-options'
import { ALL_SPORTS } from '@/constants/sports'
import type {
  ActivityIntensity,
  AreaId,
  AvailabilitySlot,
  BudgetPreference,
  DayPeriod,
  SkillLevel,
  SportId,
  SportsIntent,
} from '@/types/sports-profile'
import { formatGender } from '@/types/gender'

export { formatGender }

/** Stable ids are persisted; labels live here so they never leak into data. */
export const getSport = (sportId: SportId) =>
  ALL_SPORTS.find((sport) => sport.id === sportId)

export const getSportName = (sportId: SportId) =>
  getSport(sportId)?.name ?? sportId

export const getSkillLabel = (skillLevel: SkillLevel) =>
  SKILL_LEVELS.find((level) => level.id === skillLevel)?.label ?? skillLevel

export const getIntentLabel = (intent: SportsIntent) =>
  SPORTS_INTENTS.find((option) => option.id === intent)?.label ?? intent

export const getIntensityLabel = (intensity: ActivityIntensity | null) =>
  ACTIVITY_INTENSITIES.find((option) => option.id === intensity)?.label ?? '—'

export const getAreaName = (area: AreaId | null) =>
  AREAS.find((option) => option.id === area)?.name ?? '—'

export const getPeriodLabel = (period: DayPeriod) =>
  DAY_PERIODS.find((option) => option.id === period)?.label ?? period

export const getIntensityHint = (intensity: ActivityIntensity | null) =>
  ACTIVITY_INTENSITIES.find((option) => option.id === intensity)?.hint ?? ''

export const formatRadius = (radiusKm: number | null) =>
  radiusKm === null ? '—' : `${radiusKm} km`

export function formatBudget(budget: BudgetPreference | null): string {
  if (!budget) return '—'
  const preset = BUDGET_OPTIONS.find(
    (option) =>
      option.budget.min === budget.min && option.budget.max === budget.max,
  )
  if (preset) return preset.label
  return budget.max === null ? `RM${budget.min}+` : `RM${budget.min}–${budget.max}`
}

/** Day rows for profile display: [{ day: 'Saturday', periods: 'Afternoon · Evening' }]. */
export function formatAvailabilityRows(availability: AvailabilitySlot[]) {
  return WEEK_DAYS.flatMap(({ id, label }) => {
    const slot = availability.find((entry) => entry.day === id)
    if (!slot || slot.periods.length === 0) return []
    const periods = DAY_PERIODS.filter((period) =>
      slot.periods.includes(period.id),
    )
      .map((period) => period.label)
      .join(' · ')
    return [{ day: label, periods }]
  })
}

/** ["Sat · Afternoon, Evening", "Sun · Morning"] in week order. */
export function formatAvailability(availability: AvailabilitySlot[]): string[] {
  return WEEK_DAYS.flatMap(({ id, short }) => {
    const slot = availability.find((entry) => entry.day === id)
    if (!slot || slot.periods.length === 0) return []
    const periods = DAY_PERIODS.filter((period) =>
      slot.periods.includes(period.id),
    )
      .map((period) => getPeriodLabel(period.id))
      .join(', ')
    return [`${short} · ${periods}`]
  })
}
