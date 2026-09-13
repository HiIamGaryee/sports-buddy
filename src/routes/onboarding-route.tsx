import { Navigate, Outlet } from 'react-router-dom'

import { AppSplash } from '@/components/common/app-splash'
import { peekReturnPath } from '@/routes/return-path'
import { ROUTES } from '@/routes/routes'
import { useRouteState } from '@/routes/use-route-state'

/** Only reachable while signed in with onboarding still incomplete. */
export function OnboardingRoute() {
  const state = useRouteState()

  if (state === 'loading') return <AppSplash />
  if (state === 'guest') return <Navigate to={ROUTES.login} replace />
  // Finishing onboarding resumes a share link, if one brought them here.
  if (state === 'ready') {
    return <Navigate to={peekReturnPath() ?? ROUTES.home} replace />
  }
  return <Outlet />
}
