import type { SkillLevel, SportId, SportsIntent } from '@/types/sports-profile'

/** Who the user wants to SEE — deliberately separate from who they are. */
export interface DiscoveryPreferences {
  preferredSports: SportId[]
  preferredSkillLevels: SkillLevel[]
  preferredIntents: SportsIntent[]
  maxDistanceKm: number
  requireAvailabilityOverlap: boolean
}

export interface PrivacyPreferences {
  /** When false the profile must never appear in Discover. */
  discoverable: boolean
}

/** Values only — delivery is not implemented yet (no FCM/OneSignal). */
export interface NotificationPreferences {
  newConnection: boolean
  messages: boolean
  activityReminders: boolean
  activityChanges: boolean
}

export interface UserPreferences {
  discovery: DiscoveryPreferences
  privacy: PrivacyPreferences
  notifications: NotificationPreferences
}
