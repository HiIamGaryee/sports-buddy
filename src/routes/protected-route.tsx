import { Navigate, Outlet } from 'react-router-dom'

import { AppSplash } from '@/components/common/app-splash'
import { ConnectionSuccessDialog } from '@/features/connections/components/connection-success-dialog'
import { ConnectionProvider } from '@/providers/connection-provider'
import { ROUTES } from '@/routes/routes'
import { useRouteState } from '@/routes/use-route-state'

/**
 * The signed-in app. Pages never check auth or onboarding themselves.
 * `ConnectionProvider` is mounted here and nowhere else, so relationship
 * state is queried only for an authenticated, onboarded user — never on the
 * auth or onboarding screens.
 */
export function ProtectedRoute() {
  const state = useRouteState()

  if (state === 'loading') return <AppSplash />
  if (state === 'guest') return <Navigate to={ROUTES.login} replace />
  if (state === 'onboarding-required') {
    return <Navigate to={ROUTES.onboarding} replace />
  }
  return (
    <ConnectionProvider>
      <Outlet />
      <ConnectionSuccessDialog />
    </ConnectionProvider>
  )
}
