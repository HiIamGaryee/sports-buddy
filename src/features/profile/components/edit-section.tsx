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
      <div className="flex flex-col gap-1">
        <h2 className="text-heading-3 text-foreground">{title}</h2>
        {description && (
          <p className="text-body-small text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}
