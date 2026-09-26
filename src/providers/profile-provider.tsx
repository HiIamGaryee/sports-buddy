import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { ProfileContext } from '@/providers/profile-context'
import { profileService } from '@/services/profile/profile-service'
import type { UserPreferences } from '@/types/preferences'
import type { SaveProfileInput } from '@/types/sports-profile'
import type { ProfilePhotoChange, SportsProfile } from '@/types/user'
import type { Gender } from '@/types/gender'

interface ProfileState {
  userId: string | null
  profile: SportsProfile | null
  isLoading: boolean
}

const initialState = (userId: string | null): ProfileState => ({
  userId,
  profile: null,
  isLoading: userId !== null,
})

/**
 * The single source of truth for the signed-in user's Sports Buddy profile.
 * AuthProvider answers "who is signed in"; this answers "what is their profile".
 */
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<ProfileState>(() => initialState(userId))

  // Reset during render when the signed-in user changes — no effect needed.
  if (state.userId !== userId) setState(initialState(userId))

  useEffect(() => {
    if (!user) return

    let active = true
    profileService
      .loadProfile(user)
      .then((profile) => {
        if (active) setState({ userId: user.id, profile, isLoading: false })
      })
      .catch(() => {
        if (active) setState({ userId: user.id, profile: null, isLoading: false })
      })

    return () => {
      active = false
    }
  }, [user])

  const completeOnboarding = useCallback(
    async (input: SaveProfileInput) => {
      if (!user) throw new Error('You need to be signed in to save a profile.')
      const profile = await profileService.completeOnboarding(user.id, input)
      setState({ userId: user.id, profile, isLoading: false })
    },
    [user],
  )

  const updateProfile = useCallback(
    async (
      input: SaveProfileInput,
      maxSports?: number,
      photo?: ProfilePhotoChange,
    ) => {
      if (!user || !state.profile) {
        throw new Error('You need to be signed in to edit your profile.')
      }
      const profile = await profileService.updateProfile(
        user.id,
        input,
        state.profile.preferences,
        maxSports,
        photo,
      )
      setState({ userId: user.id, profile, isLoading: false })
    },
    [user, state.profile],
  )

  const completeGender = useCallback(
    async (gender: Gender) => {
      if (!user) throw new Error('You need to be signed in to save your gender.')
      const profile = await profileService.completeGender(user.id, gender)
      setState({ userId: user.id, profile, isLoading: false })
    },
    [user],
  )

  const updatePreferences = useCallback(
    async (preferences: UserPreferences) => {
      if (!user) throw new Error('You need to be signed in to save settings.')
      const profile = await profileService.updatePreferences(
        user.id,
        preferences,
      )
      setState({ userId: user.id, profile, isLoading: false })
    },
    [user],
  )

  const value = useMemo(
    () => ({
      profile: state.profile,
      isLoading: state.isLoading,
      completeOnboarding,
      completeGender,
      updateProfile,
      updatePreferences,
    }),
    [
      state.profile,
      state.isLoading,
      completeOnboarding,
      completeGender,
      updateProfile,
      updatePreferences,
    ],
  )

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  )
}
