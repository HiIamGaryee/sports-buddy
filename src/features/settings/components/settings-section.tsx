import { SectionHeader } from '@/components/common/section-header'
import { Card, CardContent } from '@/components/ui/card'

export function SettingsSection({
  id,
  title,
  children,
}: {
  /** Anchor target for the desktop settings nav. */
  id?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3">
      <SectionHeader level="group" title={title} />
      <Card>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </section>
  )
}
