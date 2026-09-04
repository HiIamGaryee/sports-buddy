import { createContext } from 'react'

import type { UserPreferences } from '@/types/preferences'
import type { SaveProfileInput } from '@/types/sports-profile'
import type { SportsProfile } from '@/types/user'

export interface ProfileContextValue {
  profile: SportsProfile | null
  isLoading: boolean
  completeOnboarding: (input: SaveProfileInput) => Promise<void>
  updateProfile: (input: SaveProfileInput) => Promise<void>
  updatePreferences: (preferences: UserPreferences) => Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)
