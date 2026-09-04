import { Navigate, Outlet } from 'react-router-dom'

import { AppSplash } from '@/components/common/app-splash'
import { ROUTES } from '@/routes/routes'
import { useRouteState } from '@/routes/use-route-state'

/** The signed-in app. Pages never check auth or onboarding themselves. */
export function ProtectedRoute() {
  const state = useRouteState()

  if (state === 'loading') return <AppSplash />
  if (state === 'guest') return <Navigate to={ROUTES.login} replace />
  if (state === 'onboarding-required') {
    return <Navigate to={ROUTES.onboarding} replace />
  }
  return <Outlet />
}
