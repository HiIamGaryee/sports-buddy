import { createContext } from 'react'

import type { UserPreferences } from '@/types/preferences'
import type { SaveProfileInput } from '@/types/sports-profile'
import type { Gender } from '@/types/gender'
import type { ProfilePhotoChange, SportsProfile } from '@/types/user'

export interface ProfileContextValue {
  profile: SportsProfile | null
  isLoading: boolean
  completeOnboarding: (input: SaveProfileInput) => Promise<void>
  completeGender: (gender: Gender) => Promise<void>
  updateProfile: (
    input: SaveProfileInput,
    maxSports?: number,
    photo?: ProfilePhotoChange,
  ) => Promise<void>
  updatePreferences: (preferences: UserPreferences) => Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)
