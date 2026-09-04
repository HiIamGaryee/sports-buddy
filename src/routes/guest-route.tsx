import { Navigate, Outlet } from 'react-router-dom'

import { AppSplash } from '@/components/common/app-splash'
import { ROUTES } from '@/routes/routes'
import { useRouteState } from '@/routes/use-route-state'

/** Login / register: only reachable while signed out. */
export function GuestRoute() {
  const state = useRouteState()

  if (state === 'loading') return <AppSplash />
  if (state === 'onboarding-required') {
    return <Navigate to={ROUTES.onboarding} replace />
  }
  if (state === 'ready') return <Navigate to={ROUTES.home} replace />
  return <Outlet />
}
