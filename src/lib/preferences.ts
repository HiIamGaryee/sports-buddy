import { DEFAULT_RADIUS_KM } from '@/constants/profile-options'
import type {
  DiscoveryPreferences,
  NotificationPreferences,
  PrivacyPreferences,
  UserPreferences,
} from '@/types/preferences'
import type {
  SkillLevel,
  SportsProfileFields,
  UserSport,
} from '@/types/sports-profile'

/** Every default lives here — never `?? true` scattered through components. */
export const ALL_SKILL_LEVELS: SkillLevel[] = [
  'beginner',
  'casual',
  'intermediate',
  'advanced',
]

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  newConnection: true,
  messages: true,
  activityReminders: true,
  activityChanges: true,
}

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  discoverable: true,
}

/** Derived from the profile so nobody configures the same thing twice. */
export function createDefaultDiscoveryPreferences(
  profile: Pick<SportsProfileFields, 'sports' | 'intents' | 'radiusKm'>,
): DiscoveryPreferences {
  return {
    preferredSports: profile.sports.map((sport) => sport.sportId),
    preferredSkillLevels: [...ALL_SKILL_LEVELS],
    preferredIntents: [...profile.intents],
    maxDistanceKm: profile.radiusKm ?? DEFAULT_RADIUS_KM,
    requireAvailabilityOverlap: false,
  }
}

export function createDefaultUserPreferences(
  profile: Pick<SportsProfileFields, 'sports' | 'intents' | 'radiusKm'>,
): UserPreferences {
  return {
    discovery: createDefaultDiscoveryPreferences(profile),
    privacy: { ...DEFAULT_PRIVACY_PREFERENCES },
    notifications: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  }
}

const asArray = <T>(value: unknown, fallback: T[]): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback

const asNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' ? value : fallback

/**
 * Fills in preferences for documents written before they existed (STEP 4
 * users), so no profile ever has to be recreated or deleted.
 */
export function normalizeUserPreferences(
  raw: unknown,
  profile: Pick<SportsProfileFields, 'sports' | 'intents' | 'radiusKm'>,
): UserPreferences {
  const defaults = createDefaultUserPreferences(profile)
  if (!raw || typeof raw !== 'object') return defaults

  const stored = raw as Partial<Record<keyof UserPreferences, unknown>>
  const discovery = (stored.discovery ?? {}) as Record<string, unknown>
  const privacy = (stored.privacy ?? {}) as Record<string, unknown>
  const notifications = (stored.notifications ?? {}) as Record<string, unknown>

  return {
    discovery: {
      preferredSports: asArray(
        discovery.preferredSports,
        defaults.discovery.preferredSports,
      ),
      preferredSkillLevels: asArray(
        discovery.preferredSkillLevels,
        defaults.discovery.preferredSkillLevels,
      ),
      preferredIntents: asArray(
        discovery.preferredIntents,
        defaults.discovery.preferredIntents,
      ),
      maxDistanceKm: asNumber(
        discovery.maxDistanceKm,
        defaults.discovery.maxDistanceKm,
      ),
      requireAvailabilityOverlap: asBoolean(
        discovery.requireAvailabilityOverlap,
        defaults.discovery.requireAvailabilityOverlap,
      ),
    },
    privacy: {
      discoverable: asBoolean(
        privacy.discoverable,
        defaults.privacy.discoverable,
      ),
    },
    notifications: {
      newConnection: asBoolean(
        notifications.newConnection,
        defaults.notifications.newConnection,
      ),
      messages: asBoolean(
        notifications.messages,
        defaults.notifications.messages,
      ),
      activityReminders: asBoolean(
        notifications.activityReminders,
        defaults.notifications.activityReminders,
      ),
      activityChanges: asBoolean(
        notifications.activityChanges,
        defaults.notifications.activityChanges,
      ),
    },
  }
}

/** Keeps discovery preferences consistent after the profile's sports change. */
export function reconcileDiscoveryPreferences(
  preferences: UserPreferences,
  sports: UserSport[],
): UserPreferences {
  const sportIds = sports.map((sport) => sport.sportId)
  const kept = preferences.discovery.preferredSports.filter((sportId) =>
    sportIds.includes(sportId),
  )
  return {
    ...preferences,
    discovery: {
      ...preferences.discovery,
      preferredSports: kept.length > 0 ? kept : sportIds,
    },
  }
}
