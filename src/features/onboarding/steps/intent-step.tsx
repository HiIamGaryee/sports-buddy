import { IntensitySelector } from '@/components/profile/intensity-selector'
import { IntentSelector } from '@/components/profile/intent-selector'
import type { ProfileDraft } from '@/lib/profile-draft'
import type { ActivityIntensity, SportsIntent } from '@/types/sports-profile'

export function IntentStep({
  draft,
  onToggleIntent,
  onSetIntensity,
}: {
  draft: ProfileDraft
  onToggleIntent: (intent: SportsIntent) => void
  onSetIntensity: (intensity: ActivityIntensity) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-caption text-muted-foreground uppercase">
          Pick one or more
        </h2>
        <IntentSelector selected={draft.intents} onToggle={onToggleIntent} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-caption text-muted-foreground uppercase">
          How do you like to play?
        </h2>
        <IntensitySelector
          value={draft.preferredIntensity}
          onChange={onSetIntensity}
        />
      </section>
    </div>
  )
}
