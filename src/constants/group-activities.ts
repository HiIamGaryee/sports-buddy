/** Mirrored in `firestore.rules`. */
export const MAX_GROUP_ACTIVITY_TITLE_LENGTH = 60
export const MAX_GROUP_ACTIVITY_DESCRIPTION_LENGTH = 500
export const MAX_GROUP_ACTIVITY_VENUE_NAME_LENGTH = 80
export const MAX_GROUP_ACTIVITY_HORIZON_DAYS = 90
export const MAX_GROUP_ACTIVITY_BUDGET_RM = 10_000

/** A meetup, not a stadium booking — keeps the participant list readable too. */
export const MIN_GROUP_ACTIVITY_PARTICIPANTS = 2
export const MAX_GROUP_ACTIVITY_PARTICIPANTS = 30

/** One batch for Discover — no infinite scroll, same as activity posts. */
export const GROUP_ACTIVITY_BATCH_LIMIT = 30

export const SKILL_PREFERENCE_OPTIONS = [
  { id: 'any', label: 'Any skill level' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'casual', label: 'Casual' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
] as const satisfies readonly {
  id: import('@/types/group-activity').SkillPreference
  label: string
}[]
