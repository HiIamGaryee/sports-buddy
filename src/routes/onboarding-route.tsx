import { Navigate, Outlet } from 'react-router-dom'

import { AppSplash } from '@/components/common/app-splash'
import { ROUTES } from '@/routes/routes'
import { useRouteState } from '@/routes/use-route-state'

/** Only reachable while signed in with onboarding still incomplete. */
export function OnboardingRoute() {
  const state = useRouteState()

  if (state === 'loading') return <AppSplash />
  if (state === 'guest') return <Navigate to={ROUTES.login} replace />
  if (state === 'ready') return <Navigate to={ROUTES.home} replace />
  if (state === 'gender-required') return <Navigate to={ROUTES.completeProfile} replace />
  return <Outlet />
}
