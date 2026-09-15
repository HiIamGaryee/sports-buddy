import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'

export type RouteState = 'loading' | 'guest' | 'onboarding-required' | 'gender-required' | 'ready'

/** The one place the app decides which of its three states the user is in. */
export function useRouteState(): RouteState {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { profile, isLoading: isProfileLoading } = useProfile()

  if (isAuthLoading) return 'loading'
  if (!isAuthenticated) return 'guest'
  if (isProfileLoading) return 'loading'
  if (!profile?.onboardingCompleted) return 'onboarding-required'
  return profile.gender ? 'ready' : 'gender-required'
}
