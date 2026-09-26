import {
  getPageContainerSizeClass,
  type PageContainerSize,
} from '@/components/layout/page-container-config'
import { cn } from '@/lib/utils'

/**
 * Standard page body: responsive gutters, section rhythm, mobile bottom-nav
 * clearance and the shared page-enter transition.
 *
 * `size` replaces the old single phone-width column. Every page picks the
 * width its content actually wants, so desktop is never a 480px app floating
 * in empty space and a form is never stretched to 1400px.
 */
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
        getPageContainerSizeClass(size),
        className,
      )}
    >
      {children}
    </main>
  )
}
