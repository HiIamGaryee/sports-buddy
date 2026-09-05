import { cn } from '@/lib/utils'

/**
 * THE section heading. Five places were deciding a section's typography for
 * themselves — the page section, the profile group, the settings group, the
 * edit group and a private copy inside `ProfileSummary` — which left two
 * different "uppercase label" treatments and two different heading sizes in
 * an app that only has two kinds of section.
 *
 * `level` is the whole distinction, and it is structural rather than
 * decorative:
 *   page  — a section OF the page, sitting on the background
 *   group — a group INSIDE a card, subordinate to the card's own title
 */
export function SectionHeader({
  title,
  description,
  action,
  level = 'page',
  as: Heading = 'h2',
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  level?: 'page' | 'group'
  as?: 'h2' | 'h3'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Heading
          className={
            level === 'page'
              ? 'text-heading-3 text-foreground'
              : 'text-caption text-muted-foreground uppercase'
          }
        >
          {title}
        </Heading>
        {action}
      </div>
      {description && (
        <p className="text-body-small text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
