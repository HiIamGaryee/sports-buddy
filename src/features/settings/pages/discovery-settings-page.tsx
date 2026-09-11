import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { StickyActionBar } from '@/components/layout/sticky-action-bar'
import { IntentSelector } from '@/components/profile/intent-selector'
import { RadiusSelector } from '@/components/profile/radius-selector'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChoiceChip } from '@/components/ui/choice-chip'
import { SKILL_LEVELS } from '@/constants/profile-options'
import { DiscoveryPreview } from '@/features/settings/components/discovery-preview'
import { PreferenceToggle } from '@/features/settings/components/preference-toggle'
import { useDiscoveryMatchCount } from '@/features/settings/use-discovery-match-count'
import { useProfile } from '@/hooks/use-profile'
import { getSportName } from '@/lib/profile-format'
import { ROUTES } from '@/routes/routes'
import type { DiscoveryPreferences } from '@/types/preferences'
import type { SportsProfile } from '@/types/user'

export function DiscoverySettingsPage() {
  const { profile } = useProfile()
  if (!profile) return null
  return <DiscoverySettingsForm profile={profile} />
}

const toggle = <T,>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value]

/** One section of the workspace: a card that is a whole group, not a row. */
function PreferenceCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card
      size="lg"
      className="rounded-3xl transition-ui hover:border-border-strong hover:shadow-hover"
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function DiscoverySettingsForm({ profile }: { profile: SportsProfile }) {
  const navigate = useNavigate()
  const { updatePreferences } = useProfile()
  const initial = useMemo(
    () => profile.preferences.discovery,
    [profile.preferences.discovery],
  )
  const [discovery, setDiscovery] = useState<DiscoveryPreferences>(initial)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const matchCount = useDiscoveryMatchCount(profile, discovery)

  const isDirty = JSON.stringify(discovery) !== JSON.stringify(initial)
  const problem =
    discovery.preferredSports.length === 0
      ? 'Choose at least one sport to discover.'
      : discovery.preferredSkillLevels.length === 0
        ? 'Choose at least one skill level.'
        : discovery.preferredIntents.length === 0
          ? 'Choose at least one buddy type.'
          : undefined

  const hint = problem ?? (isDirty ? undefined : 'No changes yet.')
  const saveLabel = isSaved ? 'Saved' : isSaving ? 'Saving…' : 'Save changes'
  const saveDisabled = Boolean(problem) || !isDirty || isSaving || isSaved

  const update = (patch: Partial<DiscoveryPreferences>) =>
    setDiscovery((previous) => ({ ...previous, ...patch }))

  function close() {
    navigate(ROUTES.settings)
  }

  async function handleSave() {
    if (problem || !isDirty || isSaving) return
    setSaveError('')
    setIsSaving(true)
    try {
      await updatePreferences({ ...profile.preferences, discovery })
      setIsSaved(true)
      setTimeout(close, 500)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "We couldn't update your preferences. Please try again.",
      )
      setIsSaving(false)
    }
  }

  return (
    <>
      <AppHeader
        title="Discovery"
        subtitle="Find your perfect sports buddy"
        size="full"
        showBack
        action={
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="outline" onClick={close} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={saveDisabled}
              className="rounded-full"
            >
              {saveLabel}
            </Button>
          </div>
        }
      />
      <PageContainer size="full">
        <p className="text-body text-muted-foreground">
          Choose who you want to train, play, and connect with.
        </p>

        {(saveError || hint) && (
          <p
            role={saveError ? 'alert' : undefined}
            className={
              saveError
                ? 'text-body-small text-destructive'
                : 'text-body-small text-muted-foreground'
            }
          >
            {saveError || hint}
          </p>
        )}

        {/* Controls fill the column; the preview takes the shared aside width
            rather than a per-page percentage. */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-aside-end lg:items-start lg:gap-8">
          <div className="grid gap-5 md:grid-cols-2">
            <PreferenceCard
              title="Sports to discover"
              description="From the sports on your profile."
            >
              <div
                className="flex flex-wrap gap-2"
                aria-label="Sports to discover"
                role="group"
              >
                {profile.sports.map(({ sportId }) => (
                  <ChoiceChip
                    key={sportId}
                    label={getSportName(sportId)}
                    selected={discovery.preferredSports.includes(sportId)}
                    onClick={() =>
                      update({
                        preferredSports: toggle(
                          discovery.preferredSports,
                          sportId,
                        ),
                      })
                    }
                  />
                ))}
              </div>
            </PreferenceCard>

            <PreferenceCard
              title="Skill levels"
              description="Which levels you are happy to play with."
            >
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Skill levels"
              >
                {SKILL_LEVELS.map(({ id, label }) => (
                  <ChoiceChip
                    key={id}
                    label={label}
                    selected={discovery.preferredSkillLevels.includes(id)}
                    onClick={() =>
                      update({
                        preferredSkillLevels: toggle(
                          discovery.preferredSkillLevels,
                          id,
                        ),
                      })
                    }
                  />
                ))}
              </div>
            </PreferenceCard>

            <PreferenceCard
              title="Buddy type"
              description="What you want them to want."
            >
              <IntentSelector
                selected={discovery.preferredIntents}
                onToggle={(intent) =>
                  update({
                    preferredIntents: toggle(discovery.preferredIntents, intent),
                  })
                }
              />
            </PreferenceCard>

            <PreferenceCard
              title="Maximum distance"
              description="How far you are willing to travel."
            >
              <RadiusSelector
                label="Maximum distance"
                value={discovery.maxDistanceKm}
                onChange={(maxDistanceKm) => update({ maxDistanceKm })}
              />
            </PreferenceCard>

            <PreferenceCard
              title="Availability"
              description="Whether your free times have to line up."
            >
              <PreferenceToggle
                id="availability-overlap"
                label="Only overlapping availability"
                description="Hide people who are never free when you are."
                checked={discovery.requireAvailabilityOverlap}
                onChange={(requireAvailabilityOverlap) =>
                  update({ requireAvailabilityOverlap })
                }
              />
            </PreferenceCard>
          </div>

          <DiscoveryPreview discovery={discovery} matchCount={matchCount} />
        </div>

        {/* The actions live in the header from `md`; on a phone they sit above
            the bottom navigation. */}
        <StickyActionBar offset="nav" bleed className="md:hidden">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={close}
              className="flex-1 rounded-full"
            >
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => void handleSave()}
              disabled={saveDisabled}
              className="flex-[2] rounded-full"
            >
              {saveLabel}
            </Button>
          </div>
        </StickyActionBar>
      </PageContainer>
    </>
  )
}
