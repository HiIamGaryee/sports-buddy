import { ShieldCheck } from 'lucide-react'
import { useMemo, useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EditLayout } from '@/components/layout/edit-layout'
import { AreaSelector } from '@/components/profile/area-selector'
import { AvailabilitySelector } from '@/components/profile/availability-selector'
import { BioField } from '@/components/profile/bio-field'
import { BudgetSelector } from '@/components/profile/budget-selector'
import { IntensitySelector } from '@/components/profile/intensity-selector'
import { IntentSelector } from '@/components/profile/intent-selector'
import { RadiusSelector } from '@/components/profile/radius-selector'
import { SkillSelector } from '@/components/profile/skill-selector'
import { SportSelector } from '@/components/profile/sport-selector'
import { Input } from '@/components/ui/input'
import { EditSection } from '@/features/profile/components/edit-section'
import { useProfile } from '@/hooks/use-profile'
import {
  profileDraftReducer,
  profileToDraft,
  toSaveInput,
} from '@/lib/profile-draft'
import { validateProfileInput } from '@/services/profile/profile-validation'
import { ROUTES } from '@/routes/routes'
import type { SportsProfile } from '@/types/user'

export function EditProfilePage() {
  const { profile } = useProfile()
  // ProtectedRoute guarantees an onboarded profile before this route renders.
  if (!profile) return null
  return <EditProfileForm profile={profile} />
}

function EditProfileForm({ profile }: { profile: SportsProfile }) {
  const navigate = useNavigate()
  const { updateProfile } = useProfile()
  const initialDraft = useMemo(() => profileToDraft(profile), [profile])
  const [draft, dispatch] = useReducer(profileDraftReducer, initialDraft)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const input = toSaveInput(draft)
  const problem = validateProfileInput(input)
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft)

  function close() {
    navigate(ROUTES.profile)
  }

  async function handleSave() {
    if (problem || !isDirty || isSaving) return
    setSaveError('')
    setIsSaving(true)
    try {
      await updateProfile(input)
      setIsSaved(true)
      // Brief confirmation, then back to the profile with the new values.
      setTimeout(close, 500)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "We couldn't update your profile. Please try again.",
      )
      setIsSaving(false)
    }
  }

  const saveLabel = isSaved ? 'Saved' : isSaving ? 'Saving…' : 'Save changes'
  const hint = problem ?? (isDirty ? undefined : 'No changes yet.')

  return (
    <EditLayout
      title="Edit profile"
      subtitle={profile.displayName}
      error={saveError}
      hint={hint}
      saveLabel={saveLabel}
      saveDisabled={Boolean(problem) || !isDirty || isSaving || isSaved}
      onSave={() => void handleSave()}
      onCancel={close}
    >
      <EditSection title="Basic info">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-name" className="text-label text-foreground">
            Display name
          </label>
          <Input
            id="edit-name"
            value={draft.displayName}
            onChange={(event) =>
              dispatch({ type: 'set-display-name', value: event.target.value })
            }
            autoComplete="name"
          />
        </div>
        <BioField
          id="edit-bio"
          value={draft.bio}
          onChange={(value) => dispatch({ type: 'set-bio', value })}
        />
      </EditSection>

      <EditSection
        title="Sports"
        description="Add or remove sports — removing one also clears its skill level."
      >
        <SportSelector
          selected={draft.sports.map((sport) => sport.sportId)}
          onToggle={(sportId) => dispatch({ type: 'toggle-sport', sportId })}
        />
      </EditSection>

      <EditSection title="Skill levels" description="One level per sport.">
        <SkillSelector
          sports={draft.sports}
          onChange={(sportId, skillLevel) =>
            dispatch({ type: 'set-skill', sportId, skillLevel })
          }
        />
      </EditSection>

      <EditSection title="Sports goals" description="What you want from a buddy.">
        <IntentSelector
          selected={draft.intents}
          onToggle={(intent) => dispatch({ type: 'toggle-intent', intent })}
        />
      </EditSection>

      <EditSection title="Playing style">
        <IntensitySelector
          value={draft.preferredIntensity}
          onChange={(intensity) => dispatch({ type: 'set-intensity', intensity })}
        />
      </EditSection>

      <EditSection title="Availability">
        <AvailabilitySelector
          availability={draft.availability}
          onToggle={(day, period) =>
            dispatch({ type: 'toggle-period', day, period })
          }
        />
      </EditSection>

      <EditSection title="Location">
        <AreaSelector
          inputId="edit-area-search"
          value={draft.area}
          onChange={(area) => dispatch({ type: 'set-area', area })}
        />
        <span className="text-label text-foreground">Travel radius</span>
        <RadiusSelector
          value={draft.radiusKm}
          onChange={(radiusKm) => dispatch({ type: 'set-radius', radiusKm })}
        />
        <p className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-body-small text-muted-foreground">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          Your exact location is never shown — only your general area.
        </p>
      </EditSection>

      <EditSection title="Budget" description="Typical spend for one activity.">
        <BudgetSelector
          value={draft.budget}
          onChange={(budget) => dispatch({ type: 'set-budget', budget })}
        />
      </EditSection>
    </EditLayout>
  )
}
