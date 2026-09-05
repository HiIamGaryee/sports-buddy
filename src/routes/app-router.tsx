import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/app-shell'
import { AuthLayout } from '@/components/layout/auth-layout'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { ConversationPage } from '@/features/chat/pages/conversation-page'
import { MessagesPage } from '@/features/chat/pages/messages-page'
import { OnboardingPage } from '@/features/onboarding/pages/onboarding-page'
import { BuddyProfilePage } from '@/features/discover/pages/buddy-profile-page'
import { DiscoverPage } from '@/features/discover/pages/discover-page'
import { EditProfilePage } from '@/features/profile/pages/edit-profile-page'
import { ProfilePage } from '@/features/profile/pages/profile-page'
import { DiscoverySettingsPage } from '@/features/settings/pages/discovery-settings-page'
import { SettingsPage } from '@/features/settings/pages/settings-page'
import { ActivitiesPage } from '@/pages/activities-page'
import { HomePage } from '@/pages/home-page'
import { GuestRoute } from '@/routes/guest-route'
import { OnboardingRoute } from '@/routes/onboarding-route'
import { ProtectedRoute } from '@/routes/protected-route'
import { ROUTES } from '@/routes/routes'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.register} element={<RegisterPage />} />
          </Route>
        </Route>

        <Route element={<OnboardingRoute />}>
          <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.discover} element={<DiscoverPage />} />
            <Route
              path={ROUTES.buddyProfile}
              element={<BuddyProfilePage />}
            />
            <Route path={ROUTES.activities} element={<ActivitiesPage />} />
            <Route path={ROUTES.messages} element={<MessagesPage />} />
            <Route path={ROUTES.profile} element={<ProfilePage />} />
            <Route path={ROUTES.settings} element={<SettingsPage />} />
          </Route>

          {/* Outside AppShell: the chat screen hides the bottom navigation
              so the composer owns the bottom safe area. */}
          <Route path={ROUTES.conversation} element={<ConversationPage />} />

          <Route path={ROUTES.profileEdit} element={<EditProfilePage />} />
          <Route
            path={ROUTES.discoverySettings}
            element={<DiscoverySettingsPage />}
          />
        </Route>

        <Route
          path={ROUTES.auth}
          element={<Navigate to={ROUTES.login} replace />}
        />
        <Route
          path={ROUTES.root}
          element={<Navigate to={ROUTES.home} replace />}
        />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
