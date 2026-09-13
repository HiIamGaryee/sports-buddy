import { ChevronRight, Download, Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { APP_VERSION } from '@/constants/app'
import { BlockedUsersList } from '@/features/settings/components/blocked-users-list'
import { PreferenceToggle } from '@/features/settings/components/preference-toggle'
import { SettingsRow } from '@/features/settings/components/settings-row'
import { SettingsSection } from '@/features/settings/components/settings-section'
import { PolicyDialog } from '@/features/settings/components/policy-dialog'
import { usePreferenceUpdate } from '@/features/settings/use-preference-update'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { useTheme } from '@/hooks/use-theme'
import { formatRadius } from '@/lib/profile-format'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/routes/routes'
import type { NotificationPreferences } from '@/types/preferences'
import type { ThemePreference } from '@/types/theme'

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const satisfies readonly {
  value: ThemePreference
  label: string
  icon: LucideIcon
}[]

const NOTIFICATION_OPTIONS = [
  {
    key: 'newConnection',
    label: 'New connections',
    description: 'When someone wants to play with you.',
  },
  {
    key: 'messages',
    label: 'Messages',
    description: 'New messages from your buddies.',
  },
  {
    key: 'activityReminders',
    label: 'Activity reminders',
    description: 'Before a planned session.',
  },
  {
    key: 'activityChanges',
    label: 'Activity changes',
    description: 'When a time or venue changes.',
  },
] as const satisfies readonly {
  key: keyof NotificationPreferences
  label: string
  description: string
}[]

/**
 * The section list, used for the desktop side nav and to give each section
 * its anchor id — one source, so a new section cannot be missed.
 */
const SETTINGS_SECTIONS = [
  { id: 'preferences', label: 'Preferences' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy & safety' },
  { id: 'account', label: 'Account' },
  { id: 'about', label: 'About' },
] as const

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const { save, isSaving, error } = usePreferenceUpdate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const preferences = profile?.preferences

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <>
      <AppHeader title="Settings" size="wide" />
      <PageContainer size="wide">
        {error && (
          <p role="alert" className="text-body-small text-destructive">
            {error}
          </p>
        )}

        {/* Desktop gets a section nav beside the content instead of one long
            phone list; below `lg` the grouped list is already the right shape. */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-nav-start lg:items-start lg:gap-10">
          <nav
            aria-label="Settings sections"
            className="sticky top-6 hidden lg:block"
          >
            <ul className="flex flex-col gap-1">
              {SETTINGS_SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block rounded-lg px-3 py-2 text-title text-muted-foreground transition-ui hover:bg-surface-subtle hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-6 md:gap-8">
        <SettingsSection id="preferences" title="Preferences">
          <Link
            to={ROUTES.discoverySettings}
            className="-m-2 flex items-center gap-3 rounded-xl p-2 transition-ui hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <SettingsRow
              label="Discovery"
              description={
                preferences
                  ? `${preferences.discovery.preferredSports.length} sports · up to ${formatRadius(preferences.discovery.maxDistanceKm)}`
                  : 'Who you want to see'
              }
              trailing={
                <ChevronRight
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-muted-foreground"
                />
              }
              className="flex-1"
            />
          </Link>

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="text-title text-card-foreground">Theme</span>
            <div
              role="radiogroup"
              aria-label="Theme"
              className="flex gap-2 rounded-xl bg-surface-subtle p-1"
            >
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-label transition-ui focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                    theme === value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection id="notifications" title="Notifications">
          <p className="text-body-small text-muted-foreground">
            Your choices are saved now; sending notifications arrives with a
            later step.
          </p>
          {preferences &&
            NOTIFICATION_OPTIONS.map(({ key, label, description }, index) => (
              <div key={key} className="flex flex-col gap-4">
                {index > 0 && <Separator />}
                <PreferenceToggle
                  id={`notify-${key}`}
                  label={label}
                  description={description}
                  checked={preferences.notifications[key]}
                  disabled={isSaving}
                  onChange={(checked) =>
                    void save({
                      ...preferences,
                      notifications: {
                        ...preferences.notifications,
                        [key]: checked,
                      },
                    })
                  }
                />
              </div>
            ))}
        </SettingsSection>

        <SettingsSection id="privacy" title="Privacy & safety">
          {preferences && (
            <PreferenceToggle
              id="discoverable"
              label="Discoverable"
              description={
                preferences.privacy.discoverable
                  ? 'Other Sports Buddy users can find your profile.'
                  : 'Your profile will not appear in Discover.'
              }
              checked={preferences.privacy.discoverable}
              disabled={isSaving}
              onChange={(checked) =>
                void save({
                  ...preferences,
                  privacy: { ...preferences.privacy, discoverable: checked },
                })
              }
            />
          )}
          <Separator />
          <BlockedUsersList />
          <Separator />
          <ul className="flex flex-col gap-1.5 text-body-small text-muted-foreground">
            <li>Only your general area is shared — never your exact location.</li>
            <li>Your email is never shown to other users.</li>
            <li>Location permissions are never requested.</li>
          </ul>
          <Separator />
          <PolicyDialog
            title="Privacy Policy"
            description="How Sports Buddy handles your information."
          >
            <section className="flex flex-col gap-1.5">
              <h3 className="text-title text-foreground">What we collect</h3>
              <p>Sports Buddy stores the profile details you choose to provide, such as your display name, sports, skill levels, availability, general area, and preferences.</p>
            </section>
            <section className="flex flex-col gap-1.5">
              <h3 className="text-title text-foreground">How we use it</h3>
              <p>We use this information to show compatible sports buddies, support conversations, and help you plan activities. We do not sell your personal information.</p>
            </section>
            <section className="flex flex-col gap-1.5">
              <h3 className="text-title text-foreground">What others can see</h3>
              <p>Your public profile contains only the information needed for discovery. Your email address and exact location are not shown to other members.</p>
            </section>
            <section className="flex flex-col gap-1.5">
              <h3 className="text-title text-foreground">Your choices</h3>
              <p>You can turn off Discoverable at any time. You can also update your profile details or contact the app owner to request help with your account data.</p>
            </section>
          </PolicyDialog>
          <PolicyDialog
            title="Cookie Policy"
            description="How Sports Buddy uses local storage and similar technology."
          >
            <section className="flex flex-col gap-1.5">
              <h3 className="text-title text-foreground">Essential storage</h3>
              <p>Sports Buddy uses local storage to remember your theme choice, keep an in-progress onboarding form, and support the mock development account when that mode is enabled.</p>
            </section>
            <section className="flex flex-col gap-1.5">
              <h3 className="text-title text-foreground">No advertising cookies</h3>
              <p>We do not use advertising cookies, cross-site tracking pixels, or third-party profiling cookies in the app.</p>
            </section>
            <section className="flex flex-col gap-1.5">
              <h3 className="text-title text-foreground">Managing storage</h3>
              <p>You can clear local storage from your browser or device settings. Clearing it may reset your theme, onboarding draft, and mock-mode session.</p>
            </section>
          </PolicyDialog>
        </SettingsSection>

        <SettingsSection id="account" title="Account">
          <div className="flex flex-col gap-0.5">
            <span className="text-body-small text-muted-foreground">Email</span>
            <span className="text-title text-card-foreground">
              {user?.email ?? '—'}
            </span>
          </div>
          <Separator />
          <Button
            variant="outline"
            size="lg"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="text-destructive sm:w-auto sm:self-start sm:px-8"
          >
            {isSigningOut ? 'Signing out…' : 'Sign Out'}
          </Button>
        </SettingsSection>

        <SettingsSection id="about" title="About">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-body text-muted-foreground">Version</span>
            <span className="text-title text-card-foreground">
              {APP_VERSION}
            </span>
          </div>
          <Separator />
          <SettingsRow
            label="Mock build"
            description="Download the current Android debug APK."
            trailing={
              <Button variant="outline" size="sm" asChild>
                <a
                  href="/downloads/sports-buddy-mock.apk"
                  download="sports-buddy-mock.apk"
                  aria-label="Download Mock Build APK"
                >
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
            }
          />
        </SettingsSection>
          </div>
        </div>
      </PageContainer>
    </>
  )
}
