import { ChevronRight, Monitor, Moon, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { APP_VERSION } from '@/constants/app'
import { PreferenceToggle } from '@/features/settings/components/preference-toggle'
import { SettingsSection } from '@/features/settings/components/settings-section'
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
      <AppHeader title="Settings" showBack />
      <PageContainer>
        {error && (
          <p role="alert" className="text-body-small text-destructive">
            {error}
          </p>
        )}

        <SettingsSection title="Preferences">
          <Link
            to={ROUTES.discoverySettings}
            className="-m-1 flex items-center gap-3 rounded-xl p-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-title text-card-foreground">Discovery</span>
              <span className="text-body-small text-muted-foreground">
                {preferences
                  ? `${preferences.discovery.preferredSports.length} sports · up to ${formatRadius(preferences.discovery.maxDistanceKm)}`
                  : 'Who you want to see'}
              </span>
            </div>
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Link>

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="text-title text-card-foreground">Theme</span>
            <div
              role="radiogroup"
              aria-label="Theme"
              className="flex gap-2 rounded-xl bg-muted p-1"
            >
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-label transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
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

        <SettingsSection title="Notifications">
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

        <SettingsSection title="Privacy & safety">
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
          <ul className="flex flex-col gap-1.5 text-body-small text-muted-foreground">
            <li>Only your general area is shared — never your exact location.</li>
            <li>Your email is never shown to other users.</li>
            <li>Location permissions are never requested.</li>
          </ul>
        </SettingsSection>

        <SettingsSection title="Account">
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
            className="text-destructive"
          >
            {isSigningOut ? 'Signing out…' : 'Sign Out'}
          </Button>
        </SettingsSection>

        <SettingsSection title="About">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-body text-muted-foreground">Version</span>
            <span className="text-title text-card-foreground">
              {APP_VERSION}
            </span>
          </div>
        </SettingsSection>
      </PageContainer>
    </>
  )
}
