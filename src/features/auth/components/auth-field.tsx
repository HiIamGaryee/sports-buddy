export function AuthField({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-body-small text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
