import { Navigate, Outlet } from 'react-router-dom'

import { AppSplash } from '@/components/common/app-splash'
import { peekReturnPath } from '@/routes/return-path'
import { ROUTES } from '@/routes/routes'
import { useRouteState } from '@/routes/use-route-state'

/**
 * Login / register: only reachable while signed out. Someone who arrived
 * through a share link goes back to that activity once signed in.
 */
export function GuestRoute() {
  const state = useRouteState()

  if (state === 'loading') return <AppSplash />
  if (state === 'onboarding-required') {
    return <Navigate to={ROUTES.onboarding} replace />
  }
  if (state === 'ready') {
    return <Navigate to={peekReturnPath() ?? ROUTES.home} replace />
  }
  return <Outlet />
}
