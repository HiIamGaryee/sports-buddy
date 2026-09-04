import { CalendarDays, MapPin, Volleyball } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { validateDisplayName } from '@/lib/validation'
import type { ProfileDraft } from '@/lib/profile-draft'

const WELCOME_POINTS = [
  { icon: Volleyball, label: 'The sports you play and your level' },
  { icon: CalendarDays, label: 'When you are usually free' },
  { icon: MapPin, label: 'Your general area and budget' },
] as const

export function WelcomeStep({
  draft,
  onDisplayNameChange,
}: {
  draft: ProfileDraft
  onDisplayNameChange: (value: string) => void
}) {
  const error = validateDisplayName(draft.displayName)

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {WELCOME_POINTS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="text-body text-foreground">{label}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="onboarding-name" className="text-label text-foreground">
          What should buddies call you?
        </label>
        <Input
          id="onboarding-name"
          value={draft.displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          autoComplete="name"
          placeholder="Gary"
        />
        {draft.displayName.length > 0 && error && (
          <p role="alert" className="text-body-small text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
