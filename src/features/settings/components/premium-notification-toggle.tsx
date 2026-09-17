import { LockKeyhole, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { SettingsRow } from '@/features/settings/components/settings-row'
import { PreferenceToggle } from '@/features/settings/components/preference-toggle'
import general from '@/data/general.json'
import { ROUTES } from '@/routes/routes'

const REMINDER_COPY = general.notifications.activityReminders

export function PremiumNotificationToggle({
  id,
  checked,
  disabled,
  isBuddyPlus,
  onChange,
}: {
  id: string
  checked: boolean
  disabled?: boolean
  isBuddyPlus: boolean
  onChange: (checked: boolean) => void
}) {
  if (isBuddyPlus) {
    return (
      <PreferenceToggle
        id={id}
        label={REMINDER_COPY.label}
        description={REMINDER_COPY.description}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
    )
  }

  return (
    <SettingsRow
      label={REMINDER_COPY.label}
      description={REMINDER_COPY.upgradeDescription}
      trailing={
        <Link
          to={ROUTES.paywall}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-label text-primary transition-ui hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <LockKeyhole className="size-3.5" aria-hidden />
          <Sparkles className="size-3.5" aria-hidden />
          <span>{REMINDER_COPY.upgradeLabel}</span>
        </Link>
      }
    />
  )
}
