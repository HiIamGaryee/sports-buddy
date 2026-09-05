import { ShieldCheck } from 'lucide-react'

import { AreaSelector } from '@/components/profile/area-selector'
import { RadiusSelector } from '@/components/profile/radius-selector'
import type { ProfileDraft } from '@/lib/profile-draft'
import type { AreaId } from '@/types/sports-profile'

export function LocationStep({
  draft,
  onSetArea,
  onSetRadius,
}: {
  draft: ProfileDraft
  onSetArea: (area: AreaId) => void
  onSetRadius: (radiusKm: number) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-label text-foreground">Your general area</h2>
        <AreaSelector value={draft.area} onChange={onSetArea} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-label text-foreground">
          How far are you willing to travel?
        </h2>
        <RadiusSelector value={draft.radiusKm} onChange={onSetRadius} />
      </section>

      <p className="flex items-start gap-2 rounded-xl bg-surface-subtle p-3 text-body-small text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        We only show your general area. Your exact location is never displayed.
      </p>
    </div>
  )
}
