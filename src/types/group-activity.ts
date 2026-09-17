import type { AreaId, BudgetPreference, SkillLevel, SportId } from '@/types/sports-profile'

/**
 * A PUBLIC group activity: "Saturday Badminton Meetup, 8 people, RM10–20".
 * The focus is the ACTIVITY, not one person — deliberately different from
 * `ActivityPost` (`types/activity-post.ts`), which is a 1v1 invitation with
 * one spot. Anyone with a normal Sports Buddy account can organize one;
 * there is no separate "organizer" account type.
 *
 * No group chat exists for this MVP — coordination happens through the
 * activity's own detail page (participant list, Share).
 */

/** `'any'` means the organizer welcomes every skill level. */
export type SkillPreference = SkillLevel | 'any'

/**
 * What ONE viewer can do, derived — never stored. `organizer` manages it;
 * `joined` stays joined even once it starts; `past` is a read-only record.
 */
export type GroupActivityViewerState =
  | 'organizer'
  | 'joined'
  | 'full'
  | 'can-join'
  | 'past'

export interface GroupActivity {
  id: string
  organizerId: string
  sportId: SportId
  title: string
  description: string
  startAt: string
  /** `null` when the organizer did not give an end time. */
  endAt: string | null
  timeZone: string
  areaId: AreaId
  venueName: string
  /** The estimated price range per person — reuses the profile's budget shape. */
  budget: BudgetPreference
  preferredSkillLevel: SkillPreference
  maxParticipants: number
  /** Everyone who has joined, organizer included implicitly (not listed here). */
  participantIds: string[]
  /** `null` only until a local write resolves its server timestamp. */
  createdAt: string | null
  updatedAt: string | null
}

export interface GroupActivityDraft {
  sportId: SportId | null
  title: string
  description: string
  localStartDateTime: string
  /** Optional; same local-date-time input shape as the start. */
  localEndDateTime: string
  timeZone: string
  areaId: AreaId | null
  venueName: string
  budget: BudgetPreference | null
  preferredSkillLevel: SkillPreference
  maxParticipants: number
}

/** Validated draft → the exact fields the repository may write. */
export interface CreateGroupActivityInput {
  organizerId: string
  sportId: SportId
  title: string
  description: string
  startAt: string
  endAt: string | null
  timeZone: string
  areaId: AreaId
  venueName: string
  budget: { min: number; max: number | null }
  preferredSkillLevel: SkillPreference
  maxParticipants: number
}
