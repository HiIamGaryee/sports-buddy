import { SectionHeader } from '@/components/common/section-header'

export function EditSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={title} description={description} />
      {children}
    </section>
  )
}
