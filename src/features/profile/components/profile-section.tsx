import { SectionHeader } from '@/components/common/section-header'
import { cn } from '@/lib/utils'

export function ProfileSection({
  title,
  action,
  className,
  children,
}: {
  title: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <SectionHeader level="group" title={title} action={action} />
      {children}
    </section>
  )
}
