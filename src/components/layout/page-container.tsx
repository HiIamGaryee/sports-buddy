import { cn } from '@/lib/utils'

/**
 * Standard page body: responsive gutters, section rhythm, mobile bottom-nav
 * clearance and the shared page-enter transition.
 *
 * `size` replaces the old single phone-width column. Every page picks the
 * width its content actually wants, so desktop is never a 480px app floating
 * in empty space and a form is never stretched to 1400px.
 */
const SIZES = {
  /** Auth forms and other short, single-purpose columns. */
  narrow: 'max-w-narrow',
  /** Reading/form width: profile, settings, activities. */
  default: 'max-w-default',
  /** Grids and dashboards: home, discover. */
  wide: 'max-w-wide',
  /** Panes that own their own width, e.g. the messages workspace. */
  full: 'max-w-full',
} as const

export type PageContainerSize = keyof typeof SIZES

export function PageContainer({
  size = 'default',
  className,
  children,
}: {
  size?: PageContainerSize
  className?: string
  children: React.ReactNode
}) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full flex-1 animate-in flex-col gap-6 px-gutter pt-5 pb-bottom-nav-space duration-200 ease-out fade-in-0 slide-in-from-bottom-1 md:gap-8 md:pt-6 md:pb-10',
        SIZES[size],
        className,
      )}
    >
      {children}
    </main>
  )
}
