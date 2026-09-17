import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { MAX_SPORTS, SPORTS } from '@/constants/sports'
import { SelectableCard } from '@/components/profile/selectable-card'
import { ROUTES } from '@/routes/routes'
import type { SportId } from '@/types/sports-profile'

/** Shared by onboarding and profile editing. */
export function SportSelector({
  selected,
  onToggle,
  max = MAX_SPORTS,
  showUpgrade = false,
}: {
  selected: SportId[]
  onToggle: (sportId: SportId) => void
  max?: number
  showUpgrade?: boolean
}) {
  const atLimit = selected.length >= max

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-small text-muted-foreground" aria-live="polite">
        {atLimit
          ? `That's the maximum of ${max} sports. Remove one to swap.`
          : `Choose up to ${max} sports · ${selected.length} selected`}
      </p>
      {showUpgrade && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="text-body-small text-muted-foreground">
              Free profiles can list up to {MAX_SPORTS} sports. Buddy+ unlocks up to {max}.
            </p>
          </div>
          <Link
            to={ROUTES.paywall}
            className="text-label text-primary underline-offset-4 hover:underline"
          >
            Unlock Buddy+
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {SPORTS.map(({ id, name, icon }) => (
          <SelectableCard
            key={id}
            icon={icon}
            title={name}
            compact
            selected={selected.includes(id)}
            disabled={atLimit && !selected.includes(id)}
            onClick={() => onToggle(id)}
          />
        ))}
      </div>
    </div>
  )
}
