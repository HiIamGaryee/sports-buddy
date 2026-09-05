import type { LucideIcon } from 'lucide-react'
import { TriangleAlert } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'

/**
 * THE failure surface. Discover, Activities, the conversation and venue
 * search each had their own error block with slightly different wording,
 * button size and layout; all four now render this.
 *
 * `onRetry` is optional on purpose — a configuration error is not something
 * the member can retry their way out of, so no button is offered for it.
 */
export function ErrorState({
  icon = TriangleAlert,
  title,
  description = 'Something went wrong on our side, not yours.',
  onRetry,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      role="alert"
      className={className}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry} className="px-8">
            Try again
          </Button>
        )
      }
    />
  )
}
