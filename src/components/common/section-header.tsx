export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-heading-3 text-foreground">{title}</h2>
      {action}
    </div>
  )
}
