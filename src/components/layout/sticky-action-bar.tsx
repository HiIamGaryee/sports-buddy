import { cn } from '@/lib/utils'

/**
 * THE bottom action bar. Three screens had grown their own version of this
 * chrome — the edit shell, onboarding and the buddy profile CTA — and all
 * three had drifted: two different translucencies, two different paddings,
 * and safe-area handling written out by hand each time.
 *
 * Both props describe layout facts, not styling preferences:
 *
 * `offset` — where the bar stops. `home` sits on the home indicator (a
 *   full-screen flow with no bottom navigation); `nav` sits above the bottom
 *   navigation on a phone and on the home indicator from `md`, where the
 *   navigation has become a rail.
 *
 * `bleed` — set it when the bar lives inside a gutter-padded parent such as
 *   `PageContainer`, so the divider still reaches both column edges. A bar in
 *   a full-screen shell supplies its own gutter and must not bleed, or it
 *   would hang off the viewport.
 *
 * Anything responsive beyond that — becoming a card on desktop, disappearing
 * once the actions move into a header — is the caller's, via `className`.
 */
export function StickyActionBar({
  offset = 'home',
  bleed = false,
  className,
  children,
}: {
  offset?: 'home' | 'nav'
  bleed?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'sticky z-20 border-t border-border bg-surface-overlay px-gutter pt-4 pb-safe-bottom backdrop-blur-xl',
        offset === 'nav' ? 'bottom-bottom-nav-space md:bottom-0' : 'bottom-0',
        bleed && 'bleed-gutter',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-default flex-col gap-3">
        {children}
      </div>
    </div>
  )
}
