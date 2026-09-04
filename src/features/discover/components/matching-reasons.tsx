import { Check } from 'lucide-react'

import type { MatchingReason } from '@/types/matching'

/** Why these two could play together, strongest first. */
export function MatchingReasons({ reasons }: { reasons: MatchingReason[] }) {
  if (reasons.length === 0) return null

  return (
    <ul className="flex flex-col gap-1.5">
      {reasons.map((reason) => (
        <li
          key={`${reason.type}-${reason.text}`}
          className="flex items-start gap-2 text-body-small text-card-foreground"
        >
          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
          {reason.text}
        </li>
      ))}
    </ul>
  )
}
