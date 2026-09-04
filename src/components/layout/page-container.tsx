import { cn } from '@/lib/utils'

/**
 * Standard page body: page padding, section rhythm, bottom-navigation
 * clearance and the shared page-enter transition.
 */
export function PageContainer({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <main
      className={cn(
        'flex flex-1 animate-in flex-col gap-6 px-page pt-5 pb-bottom-nav-space duration-200 ease-out fade-in-0 slide-in-from-bottom-1',
        className,
      )}
    >
      {children}
    </main>
  )
}
