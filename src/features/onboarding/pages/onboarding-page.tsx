import { useEffect, useReducer, useState } from 'react'

import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout'
import { onboardingDraftStore } from '@/features/onboarding/onboarding-draft'
import {
  createDraft,
  profileDraftReducer,
  toSaveInput,
} from '@/lib/profile-draft'
import {
  getStepError,
  ONBOARDING_STEPS,
} from '@/features/onboarding/onboarding-steps'
import { AvailabilityStep } from '@/features/onboarding/steps/availability-step'
import { BudgetStep } from '@/features/onboarding/steps/budget-step'
import { IntentStep } from '@/features/onboarding/steps/intent-step'
import { LocationStep } from '@/features/onboarding/steps/location-step'
import { PreviewStep } from '@/features/onboarding/steps/preview-step'
import { SkillsStep } from '@/features/onboarding/steps/skills-step'
import { SportsStep } from '@/features/onboarding/steps/sports-step'
import { WelcomeStep } from '@/features/onboarding/steps/welcome-step'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import type { AuthUser } from '@/types/auth'

export function OnboardingPage() {
  const { user } = useAuth()
  // The onboarding guard guarantees a signed-in user; this keeps types honest.
  if (!user) return null
  return <OnboardingFlow user={user} />
}

function OnboardingFlow({ user }: { user: AuthUser }) {
  const { completeOnboarding, profile } = useProfile()
  const [draft, dispatch] = useReducer(
    profileDraftReducer,
    user,
    ({ id, displayName }) => {
      const stored = onboardingDraftStore.read(id)
      return stored ? { ...stored, gender: stored.gender ?? profile?.gender ?? null } : createDraft(displayName, profile?.gender ?? null)
    },
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    onboardingDraftStore.write(user.id, draft)
  }, [user.id, draft])

  const step = ONBOARDING_STEPS[stepIndex]
  const stepError = getStepError(step.id, draft)
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1

  async function handleComplete() {
    setSaveError('')
    setIsSaving(true)
    try {
      await completeOnboarding(toSaveInput(draft))
      // Route state flips to `ready`, which sends the user to Home.
      onboardingDraftStore.clear()
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "We couldn't save your profile. Please try again.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleContinue() {
    if (stepError) return
    if (isLastStep) {
      void handleComplete()
      return
    }
    setSaveError('')
    setStepIndex(stepIndex + 1)
  }

  return (
    <OnboardingLayout
      step={stepIndex + 1}
      total={ONBOARDING_STEPS.length}
      title={step.title}
      subtitle={step.subtitle}
      hint={stepError}
      error={saveError}
      ctaLabel={isSaving ? 'Saving…' : step.cta}
      ctaDisabled={stepError !== undefined || isSaving}
      onBack={stepIndex > 0 ? () => setStepIndex(stepIndex - 1) : undefined}
      onContinue={handleContinue}
    >
      {step.id === 'welcome' && (
        <WelcomeStep
          draft={draft}
          onDisplayNameChange={(value) =>
            dispatch({ type: 'set-display-name', value })
          }
          onGenderChange={(gender) => dispatch({ type: 'set-gender', gender })}
        />
      )}
      {step.id === 'sports' && (
        <SportsStep
          draft={draft}
          onToggleSport={(sportId) => dispatch({ type: 'toggle-sport', sportId })}
        />
      )}
      {step.id === 'skills' && (
        <SkillsStep
          draft={draft}
          onSetSkill={(sportId, skillLevel) =>
            dispatch({ type: 'set-skill', sportId, skillLevel })
          }
        />
      )}
      {step.id === 'intent' && (
        <IntentStep
          draft={draft}
          onToggleIntent={(intent) => dispatch({ type: 'toggle-intent', intent })}
          onSetIntensity={(intensity) =>
            dispatch({ type: 'set-intensity', intensity })
          }
        />
      )}
      {step.id === 'availability' && (
        <AvailabilityStep
          draft={draft}
          onTogglePeriod={(day, period) =>
            dispatch({ type: 'toggle-period', day, period })
          }
        />
      )}
      {step.id === 'location' && (
        <LocationStep
          draft={draft}
          onSetArea={(area) => dispatch({ type: 'set-area', area })}
          onSetRadius={(radiusKm) => dispatch({ type: 'set-radius', radiusKm })}
        />
      )}
      {step.id === 'budget' && (
        <BudgetStep
          draft={draft}
          onSetBudget={(budget) => dispatch({ type: 'set-budget', budget })}
          onSetBio={(value) => dispatch({ type: 'set-bio', value })}
        />
      )}
      {step.id === 'preview' && (
        <PreviewStep draft={draft} user={user} />
      )}
    </OnboardingLayout>
  )
}
