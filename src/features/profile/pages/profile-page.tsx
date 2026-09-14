import { SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import editIcon from '@/assets/svg/magic-svgrepo-com.svg'
import settingsIcon from '@/assets/svg/settings-svgrepo-com.svg'
import previewIcon from '@/assets/svg/shirt-svgrepo-com.svg'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { ProfileSummary } from '@/components/profile/profile-summary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AvailabilitySummary } from '@/features/profile/components/availability-summary'
import { ProfileHero } from '@/features/profile/components/profile-hero'
import { SportSkillList } from '@/features/profile/components/sport-skill-list'
import { SettingsSection } from '@/features/settings/components/settings-section'
import { useProfile } from '@/hooks/use-profile'
import { toDiscoveryProfile } from '@/lib/discovery-profile'
import {
  formatBudget,
  formatRadius,
  getAreaName,
  getIntensityHint,
  getIntensityLabel,
  getIntentLabel,
} from '@/lib/profile-format'
import { getProfileCompleteness } from '@/lib/profile-completeness'
import { ROUTES } from '@/routes/routes'

const READY_TO_PLAY_THRESHOLD = 90

const PROFILE_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sports', label: 'Sports' },
  { id: 'availability', label: 'Availability' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'discovery', label: 'Discovery' },
] as const

export function ProfilePage() {
  const { profile, isLoading } = useProfile()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const completeness = useMemo(
    () => (profile ? getProfileCompleteness(profile) : null),
    [profile],
  )
  const preview = useMemo(
    () => (profile ? toDiscoveryProfile(profile) : null),
    [profile],
  )

  return (
    <>
      <AppHeader
        title="Profile"
        size="wide"
        action={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
            title="Settings"
            asChild
          >
            <Link to={ROUTES.settings}>
              <img
                src={settingsIcon}
                alt=""
                aria-hidden
                className="size-5 object-contain"
              />
            </Link>
          </Button>
        }
      />
      <PageContainer size="wide">
        {!profile || !completeness || !preview ? (
          <ProfileSkeleton isLoading={isLoading} />
        ) : (
          <div className="flex flex-col gap-6 lg:grid lg:grid-nav-start lg:items-start lg:gap-10">
            <nav
              aria-label="Profile sections"
              className="sticky top-6 hidden lg:block"
            >
              <ul className="flex flex-col gap-1">
                {PROFILE_SECTIONS.map(({ id, label }) => (
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
              <SettingsSection id="overview" title="Overview">
                <ProfileHero
                  profile={profile}
                  isReadyToPlay={
                    profile.preferences.privacy.discoverable &&
                    completeness.percent >= READY_TO_PLAY_THRESHOLD
                  }
                />
                <Separator />
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-title text-card-foreground">
                      Profile strength
                    </span>
                    <span className="text-label text-primary">
                      {completeness.percent}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Profile strength"
                    aria-valuenow={completeness.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                      style={{ width: `${completeness.percent}%` }}
                    />
                  </div>
                  {completeness.hint && (
                    <p className="text-body-small text-muted-foreground">
                      {completeness.hint}
                    </p>
                  )}
                </div>
                <Separator />
                <div className="flex gap-3">
                  <Button
                    size="icon-lg"
                    className="rounded-full"
                    aria-label="Edit profile"
                    title="Edit profile"
                    asChild
                  >
                    <Link to={ROUTES.profileEdit}>
                      <img
                        src={editIcon}
                        alt=""
                        aria-hidden
                        className="size-5 object-contain"
                      />
                    </Link>
                  </Button>
                  <Dialog
                    open={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="icon-lg"
                        variant="outline"
                        className="rounded-full"
                        aria-label="Preview profile"
                        title="Preview profile"
                      >
                        <img
                          src={previewIcon}
                          alt=""
                          aria-hidden
                          className="size-5 object-contain"
                        />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[85dvh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Profile preview</DialogTitle>
                        <DialogDescription>
                          Only these details are ever shared with other users.
                        </DialogDescription>
                      </DialogHeader>
                      <ProfileSummary profile={preview} />
                    </DialogContent>
                  </Dialog>
                </div>
              </SettingsSection>

              <SettingsSection id="sports" title="Sports & playing style">
                <SportSkillList sports={profile.sports} />
                <Separator />
                <div className="flex flex-col gap-2">
                  <span className="text-caption text-muted-foreground uppercase">
                    Playing style
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-title text-card-foreground">
                      {getIntensityLabel(profile.preferredIntensity)}
                    </span>
                    <span className="text-body-small text-muted-foreground">
                      {getIntensityHint(profile.preferredIntensity)}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                  <span className="text-caption text-muted-foreground uppercase">
                    What I&apos;m looking for
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.intents.map((intent) => (
                      <Badge key={intent} variant="outline">
                        {getIntentLabel(intent)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection id="availability" title="Availability">
                <AvailabilitySummary availability={profile.availability} />
              </SettingsSection>

              <SettingsSection id="preferences" title="Location & budget">
                <div className="grid gap-6 md:grid-cols-2 md:gap-8">
                  <div className="flex flex-col gap-3">
                    <span className="text-caption text-muted-foreground uppercase">
                      Location
                    </span>
                    <div className="flex flex-col gap-2">
                      <DetailRow label="Area" value={getAreaName(profile.area)} />
                      <DetailRow
                        label="Travel radius"
                        value={formatRadius(profile.radiusKm)}
                      />
                      <p className="text-body-small text-muted-foreground">
                        Your exact location is never shown.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <span className="text-caption text-muted-foreground uppercase">
                      Budget
                    </span>
                    <span className="text-metric text-card-foreground">
                      {formatBudget(profile.budget)}
                      <span className="text-body-small text-muted-foreground">
                        {' '}
                        / activity
                      </span>
                    </span>
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection id="discovery" title="Discovery">
                <div className="flex items-center gap-3">
                  <SlidersHorizontal
                    aria-hidden
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-title text-card-foreground">
                      {profile.preferences.privacy.discoverable
                        ? 'Discoverable'
                        : 'Hidden from Discover'}
                    </span>
                    <span className="text-body-small text-muted-foreground">
                      Up to{' '}
                      {formatRadius(
                        profile.preferences.discovery.maxDistanceKm,
                      )}{' '}
                      away
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Change discovery settings"
                    title="Change discovery settings"
                    asChild
                  >
                    <Link to={ROUTES.discoverySettings}>
                      <img
                        src={settingsIcon}
                        alt=""
                        aria-hidden
                        className="size-4 object-contain"
                      />
                    </Link>
                  </Button>
                </div>
              </SettingsSection>
            </div>
          </div>
        )}
      </PageContainer>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-body text-muted-foreground">{label}</span>
      <span className="text-title text-card-foreground">{value}</span>
    </div>
  )
}

function ProfileSkeleton({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) {
    return (
      <p className="text-body text-muted-foreground">
        We couldn&apos;t load your profile. Pull down or reopen the app to retry.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-13 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  )
}
