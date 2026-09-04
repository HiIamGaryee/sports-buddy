import { Card, CardContent } from '@/components/ui/card'

export function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-caption text-muted-foreground uppercase">{title}</h2>
      <Card>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </section>
  )
}
