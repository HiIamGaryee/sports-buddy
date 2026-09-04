export function AuthAlert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-body-small text-destructive"
    >
      {message}
    </p>
  )
}
