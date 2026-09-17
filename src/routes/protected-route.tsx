import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { AppSplash } from '@/components/common/app-splash'
import { ConnectionSuccessDialog } from '@/features/connections/components/connection-success-dialog'
import { ConnectionProvider } from '@/providers/connection-provider'
import { ConversationsProvider } from '@/providers/conversations-provider'
import { SubscriptionProvider } from '@/providers/subscription-provider'
import { ROUTES } from '@/routes/routes'
import { useRouteState } from '@/routes/use-route-state'

/**
 * The signed-in app. Pages never check auth or onboarding themselves.
 * `ConnectionProvider`, `ConversationsProvider` and `SubscriptionProvider`
 * are mounted here and nowhere else, so relationship, conversation and
 * Buddy+ entitlement state are queried only for an authenticated, onboarded
 * user — never on the auth or onboarding screens.
 */
export function ProtectedRoute() {
  const state = useRouteState()
  const location = useLocation()

  if (state === 'loading') return <AppSplash />
  if (state === 'guest') return <Navigate to={ROUTES.login} replace />
  if (state === 'onboarding-required') {
    return <Navigate to={ROUTES.onboarding} replace />
  }
  if (state === 'gender-required' && location.pathname !== ROUTES.completeProfile) {
    return <Navigate to={ROUTES.completeProfile} replace />
  }
  return (
    <ConnectionProvider>
      <ConversationsProvider>
        <SubscriptionProvider>
          <Outlet />
          <ConnectionSuccessDialog />
        </SubscriptionProvider>
      </ConversationsProvider>
    </ConnectionProvider>
  )
}
