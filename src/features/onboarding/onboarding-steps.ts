import type { ProfileDraft } from '@/lib/profile-draft'
import { profileRules } from '@/services/profile/profile-validation'

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Sports Buddy',
    subtitle: 'A few quick questions so we can find you the right people.',
    cta: 'Get started',
  },
  {
    id: 'sports',
    title: 'Which sports do you play?',
    subtitle: 'Pick the ones you actually want a buddy for.',
    cta: 'Continue',
  },
  {
    id: 'skills',
    title: 'How would you rate yourself?',
    subtitle: 'Per sport — nobody is the same level at everything.',
    cta: 'Continue',
  },
  {
    id: 'intent',
    title: 'What are you looking for?',
    subtitle: 'This shapes who we suggest later.',
    cta: 'Continue',
  },
  {
    id: 'availability',
    title: 'When are you usually free?',
    subtitle: 'General weekly pattern, not exact times.',
    cta: 'Continue',
  },
  {
    id: 'location',
    title: 'Where do you play?',
    subtitle: 'General area only, plus how far you can travel.',
    cta: 'Continue',
  },
  {
    id: 'budget',
    title: "What's your usual budget?",
    subtitle: 'Per activity — courts, entry fees, that kind of thing.',
    cta: 'Continue',
  },
  {
    id: 'preview',
    title: 'Ready to go',
    subtitle: 'Check it over before we save your profile.',
    cta: 'Complete Profile',
  },
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id']

/** What still blocks this step, or `undefined` when it may be advanced. */
export function getStepError(
  stepId: OnboardingStepId,
  draft: ProfileDraft,
): string | undefined {
  switch (stepId) {
    case 'welcome':
      return profileRules.displayName(draft.displayName)
    case 'sports':
      return profileRules.sports(draft.sports)
    case 'skills':
      return profileRules.skills(draft.sports)
    case 'intent':
      return (
        profileRules.intents(draft.intents) ??
        profileRules.intensity(draft.preferredIntensity)
      )
    case 'availability':
      return profileRules.availability(draft.availability)
    case 'location':
      return (
        profileRules.area(draft.area) ?? profileRules.radius(draft.radiusKm)
      )
    case 'budget':
      return profileRules.budget(draft.budget) ?? profileRules.bio(draft.bio)
    case 'preview':
      return undefined
  }
}
