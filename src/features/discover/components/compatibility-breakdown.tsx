import {
  MATCHING_FACTOR_KEYS,
  MAX_COMPATIBILITY_SCORE,
} from '@/services/matching/matching-constants'
import type { CompatibilityResult, MatchingFactorKey } from '@/types/matching'

const FACTOR_TITLES = {
  sports: 'Sports',
  skill: 'Skill',
  availability: 'Availability',
  location: 'Location',
  budget: 'Budget',
} as const satisfies Record<MatchingFactorKey, string>

/**
 * The explainable half of the score: a qualitative word per factor with the
 * weighted points kept small and secondary. Readable, not a tax audit.
 */
export function CompatibilityBreakdown({
  compatibility,
}: {
  compatibility: CompatibilityResult
}) {
  return (
    <div className="flex flex-col gap-2">
      {MATCHING_FACTOR_KEYS.map((key) => {
        const factor = compatibility.factors[key]
        return (
          <div
            key={key}
            className="flex items-start justify-between gap-3 rounded-xl bg-surface-subtle px-3 py-2.5"
          >
            <div className="flex min-w-0 flex-col">
              <span className="text-title text-card-foreground">
                {FACTOR_TITLES[key]}
              </span>
              <span className="text-body-small text-muted-foreground">
                {factor.detail}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="text-label text-primary">{factor.label}</span>
              <span className="text-caption text-muted-foreground">
                {factor.score} / {factor.maxScore}
              </span>
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between gap-3 px-3 pt-1">
        <span className="text-caption text-muted-foreground uppercase">
          Total
        </span>
        <span className="text-label text-card-foreground">
          {compatibility.score} / {MAX_COMPATIBILITY_SCORE}
        </span>
      </div>
    </div>
  )
}
