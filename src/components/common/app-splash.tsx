import { APP_NAME } from '@/constants/app'

/** Shown while the session is being restored, so routes never flash. */
export function AppSplash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-page">
      <span className="text-heading-2 text-foreground">{APP_NAME}</span>
      <span className="h-1 w-16 animate-pulse rounded-full bg-primary" />
      <span className="text-body-small text-muted-foreground">Getting ready…</span>
    </div>
  )
}
