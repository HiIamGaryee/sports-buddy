export const APP_NAME = 'Sports Buddy'
export const APP_VERSION = '0.1.0'

export const APP_TAGLINE_LINES = ['Find your people.', 'Go play.'] as const

/** Keep in sync with the no-flash theme script in index.html. */
export const THEME_STORAGE_KEY = 'sports-buddy.theme'

/** Onboarding draft, so refreshing mid-onboarding does not lose progress. */
export const ONBOARDING_DRAFT_KEY = 'sports-buddy.onboarding-draft'

/**
 * Which conversations a viewer has already read. Device-local by design —
 * see `src/lib/chat-read-state.ts`. Used in BOTH data-source modes, so it is
 * deliberately not one of `MOCK_STORAGE_KEYS`.
 */
export const CHAT_READ_STATE_KEY = 'sports-buddy.chat-read-state'

/** Mock-mode development storage (never used when VITE_DATA_SOURCE=firebase). */
export const MOCK_STORAGE_KEYS = {
  session: 'sports-buddy.mock-session',
  accounts: 'sports-buddy.mock-accounts',
  users: 'sports-buddy.mock-users',
  publicProfiles: 'sports-buddy.mock-public-profiles',
  connections: 'sports-buddy.mock-connections',
  chat: 'sports-buddy.mock-chat',
  activityPlans: 'sports-buddy.mock-activity-plans',
  activities: 'sports-buddy.mock-activities',
} as const
