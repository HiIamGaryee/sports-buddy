import { DEFAULT_RADIUS_KM } from '@/constants/profile-options'
import { MAX_SPORTS } from '@/constants/sports'
import type {
  ActivityIntensity,
  AreaId,
  AvailabilitySlot,
  BudgetPreference,
  DayPeriod,
  SaveProfileInput,
  SkillLevel,
  SportId,
  SportsIntent,
  WeekDay,
} from '@/types/sports-profile'
import type { SportsProfile } from '@/types/user'

/**
 * Shared editing state for a sports profile: used by onboarding and by
 * profile editing, so there is one reducer, not two.
 *
 * Skill is unset until the user picks one, hence `null` in the draft only.
 */
export interface DraftSport {
  sportId: SportId
  skillLevel: SkillLevel | null
}

export interface ProfileDraft {
  displayName: string
  bio: string
  sports: DraftSport[]
  intents: SportsIntent[]
  preferredIntensity: ActivityIntensity | null
  availability: AvailabilitySlot[]
  area: AreaId | null
  radiusKm: number | null
  budget: BudgetPreference | null
}

export type ProfileDraftAction =
  | { type: 'set-display-name'; value: string }
  | { type: 'toggle-sport'; sportId: SportId }
  | { type: 'set-skill'; sportId: SportId; skillLevel: SkillLevel }
  | { type: 'toggle-intent'; intent: SportsIntent }
  | { type: 'set-intensity'; intensity: ActivityIntensity }
  | { type: 'toggle-period'; day: WeekDay; period: DayPeriod }
  | { type: 'set-area'; area: AreaId }
  | { type: 'set-radius'; radiusKm: number }
  | { type: 'set-budget'; budget: BudgetPreference }
  | { type: 'set-bio'; value: string }

export const createDraft = (displayName: string): ProfileDraft => ({
  displayName,
  bio: '',
  sports: [],
  intents: [],
  preferredIntensity: null,
  availability: [],
  area: null,
  radiusKm: DEFAULT_RADIUS_KM,
  budget: null,
})

const toggle = <T>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value]

function togglePeriod(
  availability: AvailabilitySlot[],
  day: WeekDay,
  period: DayPeriod,
): AvailabilitySlot[] {
  const existing = availability.find((slot) => slot.day === day)
  if (!existing) return [...availability, { day, periods: [period] }]

  const periods = toggle(existing.periods, period)
  return availability.flatMap((slot) =>
    slot.day === day ? (periods.length > 0 ? [{ day, periods }] : []) : [slot],
  )
}

export function profileDraftReducer(
  state: ProfileDraft,
  action: ProfileDraftAction,
): ProfileDraft {
  switch (action.type) {
    case 'set-display-name':
      return { ...state, displayName: action.value }
    case 'toggle-sport': {
      const selected = state.sports.some(
        (sport) => sport.sportId === action.sportId,
      )
      if (selected) {
        return {
          ...state,
          sports: state.sports.filter(
            (sport) => sport.sportId !== action.sportId,
          ),
        }
      }
      if (state.sports.length >= MAX_SPORTS) return state
      return {
        ...state,
        sports: [...state.sports, { sportId: action.sportId, skillLevel: null }],
      }
    }
    case 'set-skill':
      return {
        ...state,
        sports: state.sports.map((sport) =>
          sport.sportId === action.sportId
            ? { ...sport, skillLevel: action.skillLevel }
            : sport,
        ),
      }
    case 'toggle-intent':
      return { ...state, intents: toggle(state.intents, action.intent) }
    case 'set-intensity':
      return { ...state, preferredIntensity: action.intensity }
    case 'toggle-period':
      return {
        ...state,
        availability: togglePeriod(
          state.availability,
          action.day,
          action.period,
        ),
      }
    case 'set-area':
      return { ...state, area: action.area }
    case 'set-radius':
      return { ...state, radiusKm: action.radiusKm }
    case 'set-budget':
      return { ...state, budget: action.budget }
    case 'set-bio':
      return { ...state, bio: action.value }
  }
}

/** Draft → persistable input. Sports without a skill are never invented. */
export function toSaveInput(draft: ProfileDraft): SaveProfileInput {
  return {
    displayName: draft.displayName,
    bio: draft.bio,
    sports: draft.sports.flatMap((sport) =>
      sport.skillLevel
        ? [{ sportId: sport.sportId, skillLevel: sport.skillLevel }]
        : [],
    ),
    intents: draft.intents,
    preferredIntensity: draft.preferredIntensity,
    availability: draft.availability,
    area: draft.area,
    radiusKm: draft.radiusKm,
    budget: draft.budget,
  }
}

/** Existing profile → editable draft. */
export const profileToDraft = (profile: SportsProfile): ProfileDraft => ({
  displayName: profile.displayName,
  bio: profile.bio,
  sports: profile.sports.map((sport) => ({ ...sport })),
  intents: [...profile.intents],
  preferredIntensity: profile.preferredIntensity,
  availability: profile.availability.map((slot) => ({
    ...slot,
    periods: [...slot.periods],
  })),
  area: profile.area,
  radiusKm: profile.radiusKm,
  budget: profile.budget,
})
