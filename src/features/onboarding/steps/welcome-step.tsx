import { CalendarDays, MapPin, Volleyball } from 'lucide-react'

import { FormField } from '@/components/common/form-field'
import { Input } from '@/components/ui/input'
import { ChoiceChip } from '@/components/ui/choice-chip'
import { validateDisplayName } from '@/lib/validation'
import { GENDER_OPTIONS } from '@/types/gender'
import { profileRules } from '@/services/profile/profile-validation'
import type { ProfileDraft } from '@/lib/profile-draft'

const WELCOME_POINTS = [
  { icon: Volleyball, label: 'The sports you play and your level' },
  { icon: CalendarDays, label: 'When you are usually free' },
  { icon: MapPin, label: 'Your general area and budget' },
] as const

export function WelcomeStep({
  draft,
  onDisplayNameChange,
  onGenderChange,
}: {
  draft: ProfileDraft
  onDisplayNameChange: (value: string) => void
  onGenderChange: (gender: import('@/types/gender').Gender) => void
}) {
  const error = validateDisplayName(draft.displayName)

  const genderError = profileRules.gender(draft.gender)

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {WELCOME_POINTS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="text-body text-foreground">{label}</span>
          </li>
        ))}
      </ul>

      <FormField
        id="onboarding-name"
        label="What should buddies call you?"
        error={draft.displayName.length > 0 ? error : undefined}
      >
        <Input
          id="onboarding-name"
          value={draft.displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          autoComplete="name"
          placeholder="Gary"
        />
      </FormField>
      <FormField id="onboarding-gender" label="Gender" error={genderError}>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Gender">
          {GENDER_OPTIONS.map(({ value, label }) => (
            <ChoiceChip key={value} label={label} selection="single" selected={draft.gender === value} disabled={draft.gender !== null} onClick={() => onGenderChange(value)} className="w-full rounded-xl" />
          ))}
        </div>
        <p className="text-body-small text-muted-foreground">Gender can&apos;t be changed after account creation.</p>
      </FormField>
    </div>
  )
}
