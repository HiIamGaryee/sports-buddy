import { cn } from '@/lib/utils'

/**
 * One row inside a settings card: a label, an optional supporting line, and
 * whatever control sits on the right.
 *
 * It exists because the navigational row and the toggle row had written the
 * same label/description block twice with different type, so a switch row and
 * a link row did not line up in the same card.
 *
 * `htmlFor` makes the label a real `<label>` — the toggle rows need that, the
 * link rows must not have it.
 */
export function SettingsRow({
  label,
  description,
  htmlFor,
  trailing,
  className,
}: {
  label: string
  description?: string
  htmlFor?: string
  trailing?: React.ReactNode
  className?: string
}) {
  const Label = htmlFor ? 'label' : 'span'

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label htmlFor={htmlFor} className="text-title text-card-foreground">
          {label}
        </Label>
        {description && (
          <span className="text-body-small text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      {trailing}
    </div>
  )
}
