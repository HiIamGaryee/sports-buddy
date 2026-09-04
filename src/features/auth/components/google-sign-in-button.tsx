import { Button } from '@/components/ui/button'

/**
 * Neutral, theme-compatible provider button — no third-party logo asset.
 * Web popup flow only; native Google sign-in comes with the Capacitor phase.
 */
export function GoogleSignInButton({
  onClick,
  disabled,
  label = 'Continue with Google',
}: {
  onClick: () => void
  disabled?: boolean
  label?: string
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  )
}
