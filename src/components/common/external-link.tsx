import type { LucideIcon } from 'lucide-react'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { safeLinkUrl } from '@/lib/safe-url'

/**
 * THE outbound link. Every `href` in the app that leaves the app goes through
 * here, because every one of those URLs came from somewhere untrusted: a
 * OpenStreetMap response, or a plan document the other participant wrote.
 *
 * Two protections, neither optional:
 *
 * - `safeLinkUrl` — an http(s) allowlist. A `javascript:` or `data:` URL is
 *   not "cleaned up", it renders NOTHING, so a hostile string can never
 *   become a clickable control.
 * - `rel="noopener noreferrer"` alongside `target="_blank"` — without
 *   `noopener` the opened page can reach back through `window.opener`.
 */
export function SafeExternalLink({
  href,
  label,
  icon: Icon = ExternalLinkIcon,
  ariaLabel,
  size = 'default',
  className,
}: {
  href: unknown
  label: string
  icon?: LucideIcon
  ariaLabel?: string
  size?: 'default' | 'sm'
  className?: string
}) {
  const safeHref = safeLinkUrl(href)
  if (!safeHref) return null

  return (
    <Button variant="outline" size={size} asChild className={className}>
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel ?? label}
      >
        <Icon aria-hidden className="size-4" />
        {label}
      </a>
    </Button>
  )
}
