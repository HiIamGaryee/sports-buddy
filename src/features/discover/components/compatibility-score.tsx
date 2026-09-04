import { cn } from '@/lib/utils'

/**
 * The headline score. Never colour-coded by band: the number and its label
 * carry the meaning, so it reads the same to a screen reader and nobody is
 * painted red. `size="lg"` is the candidate profile, the default is the card.
 */
export function CompatibilityScore({
  score,
  label,
  size = 'sm',
  className,
}: {
  score: number
  label: string
  size?: 'sm' | 'lg'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-end', className)}>
      <span
        className={cn(
          'text-card-foreground',
          size === 'lg' ? 'text-display' : 'text-metric',
        )}
        aria-label={`${score} percent compatible`}
      >
        {score}
        <span className="text-body-small text-muted-foreground">%</span>
      </span>
      <span className="text-caption text-primary uppercase">{label}</span>
    </div>
  )
}
