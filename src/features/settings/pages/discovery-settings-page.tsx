import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EditLayout } from '@/components/layout/edit-layout'
import { IntentSelector } from '@/components/profile/intent-selector'
import { RadiusSelector } from '@/components/profile/radius-selector'
import { SelectionChip } from '@/components/profile/selection-chip'
import { SKILL_LEVELS } from '@/constants/profile-options'
import { EditSection } from '@/features/profile/components/edit-section'
import { PreferenceToggle } from '@/features/settings/components/preference-toggle'
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

  const isDirty = JSON.stringify(discovery) !== JSON.stringify(initial)
  const problem =
    discovery.preferredSports.length === 0
      ? 'Choose at least one sport to discover.'
      : discovery.preferredSkillLevels.length === 0
        ? 'Choose at least one skill level.'
        : discovery.preferredIntents.length === 0
          ? 'Choose at least one buddy type.'
          : undefined

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
    <EditLayout
      title="Discovery"
      subtitle="Who you want to see"
      error={saveError}
      hint={problem ?? (isDirty ? undefined : 'No changes yet.')}
      saveLabel={isSaved ? 'Saved' : isSaving ? 'Saving…' : 'Save changes'}
      saveDisabled={Boolean(problem) || !isDirty || isSaving || isSaved}
      onSave={() => void handleSave()}
      onCancel={close}
    >
      <EditSection
        title="Sports to discover"
        description="From the sports on your profile."
      >
        <div
          className="flex flex-wrap gap-2"
          aria-label="Sports to discover"
          role="group"
        >
          {profile.sports.map(({ sportId }) => (
            <SelectionChip
              key={sportId}
              label={getSportName(sportId)}
              selected={discovery.preferredSports.includes(sportId)}
              onClick={() =>
                update({
                  preferredSports: toggle(discovery.preferredSports, sportId),
                })
              }
            />
          ))}
        </div>
      </EditSection>

      <EditSection
        title="Skill levels"
        description="Which levels you are happy to play with."
      >
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Skill levels">
          {SKILL_LEVELS.map(({ id, label }) => (
            <SelectionChip
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
      </EditSection>

      <EditSection title="Buddy type" description="What you want them to want.">
        <IntentSelector
          selected={discovery.preferredIntents}
          onToggle={(intent) =>
            update({
              preferredIntents: toggle(discovery.preferredIntents, intent),
            })
          }
        />
      </EditSection>

      <EditSection title="Maximum distance">
        <RadiusSelector
          label="Maximum distance"
          value={discovery.maxDistanceKm}
          onChange={(maxDistanceKm) => update({ maxDistanceKm })}
        />
      </EditSection>

      <EditSection title="Availability">
        <PreferenceToggle
          id="availability-overlap"
          label="Only overlapping availability"
          description="Hide people who are never free when you are."
          checked={discovery.requireAvailabilityOverlap}
          onChange={(requireAvailabilityOverlap) =>
            update({ requireAvailabilityOverlap })
          }
        />
      </EditSection>
    </EditLayout>
  )
}
