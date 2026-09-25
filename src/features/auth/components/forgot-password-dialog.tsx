import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/common/form-field'
import { validateEmail } from '@/features/auth/validation'
import { authService } from '@/services/auth/auth-service'

/**
 * "Forgot password?" — asks Firebase to email a reset link.
 *
 * The confirmation deliberately does NOT say whether an account exists for
 * that address: a different answer for a registered and an unregistered email
 * would let anyone test which addresses have accounts here. So it always reads
 * "if that address has an account, the email is on its way".
 *
 * It calls the service directly rather than going through `AuthProvider`,
 * because nothing about signed-in state changes — no user is created,
 * replaced or signed out by sending a reset.
 */
export function ForgotPasswordDialog({
  open,
  initialEmail,
  onOpenChange,
}: {
  open: boolean
  initialEmail: string
  onOpenChange: (open: boolean) => void
}) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  // Reopening starts clean, and carries over whatever they typed to sign in.
  useEffect(() => {
    if (open) {
      setEmail(initialEmail)
      setError('')
      setIsSent(false)
    }
  }, [open, initialEmail])

  const send = async () => {
    const problem = validateEmail(email)
    if (problem) {
      setError(problem)
      return
    }
    setIsSending(true)
    setError('')
    try {
      await authService.sendPasswordReset(email)
      setIsSent(true)
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "We couldn't send that email. Please try again.",
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>
            We&apos;ll email you a link to choose a new one.
          </DialogDescription>
        </DialogHeader>

        {isSent ? (
          <div className="flex flex-col gap-4">
            <p role="status" className="text-body-small text-muted-foreground">
              If <span className="text-foreground">{email}</span> has a Sports Buddy account,
              a reset link is on its way. Check your spam folder if it does not arrive in a
              few minutes.
            </p>
            <DialogFooter className="-mx-4 -mb-4">
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
          >
            <FormField id="reset-email" label="Email" error={error}>
              <Input
                id="reset-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
                placeholder="you@email.com"
              />
            </FormField>
            <DialogFooter className="-mx-4 -mb-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSending || email.trim().length === 0}>
                {isSending ? 'Sending…' : 'Send reset link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
