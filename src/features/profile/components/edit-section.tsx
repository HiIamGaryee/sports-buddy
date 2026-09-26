import { SectionHeader } from '@/components/common/section-header'
import { cn } from '@/lib/utils'

export function EditSection({
  title,
  description,
  className,
  children,
}: {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  )
}
