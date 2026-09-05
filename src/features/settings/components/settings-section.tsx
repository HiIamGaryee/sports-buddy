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
      <h2 className="text-caption text-muted-foreground uppercase">{title}</h2>
      <Card>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </section>
  )
}
