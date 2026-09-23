import { useState } from 'react'
import { Link } from 'react-router-dom'

import { env } from '@/config/env'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthAlert } from '@/features/auth/components/auth-alert'
import { AuthDivider } from '@/features/auth/components/auth-divider'
import { FormField } from '@/components/common/form-field'
import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button'
import { PasswordInput } from '@/features/auth/components/password-input'
import {
  validateEmail,
  validateRequiredPassword,
} from '@/features/auth/validation'
import { useAuth } from '@/hooks/use-auth'
import { MOCK_LOGIN_DEFAULTS } from '@/repositories/auth/mock-auth-repository'
import { isNativeApp } from '@/lib/platform'
import { ROUTES } from '@/routes/routes'

interface LoginForm {
  email: string
  password: string
}

type FieldErrors = Partial<Record<keyof LoginForm, string>>
type Pending = 'email' | 'google' | null

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const [form, setForm] = useState<LoginForm>(() =>
    env.dataSource === 'mock'
      ? { ...MOCK_LOGIN_DEFAULTS }
      : { email: '', password: '' },
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState<Pending>(null)

  const update = <K extends keyof LoginForm>(key: K, value: LoginForm[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }))

  async function run(action: Pending, task: () => Promise<void>) {
    if (pending) return
    setFormError('')
    setPending(action)
    try {
      await task()
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Something went wrong.',
      )
    } finally {
      setPending(null)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const errors: FieldErrors = {
      email: validateEmail(form.email),
      password: validateRequiredPassword(form.password),
    }
    setFieldErrors(errors)
    if (errors.email || errors.password) return

    await run('email', () => signIn(form))
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-display text-foreground">Welcome back.</h1>
        <p className="text-body text-muted-foreground">
          Your next game starts with the right people.
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {formError && <AuthAlert message={formError} />}

        <FormField id="login-email" label="Email" error={fieldErrors.email}>
          <Input
            id="login-email"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@email.com"
          />
        </FormField>

        <FormField
          id="login-password"
          label="Password"
          error={fieldErrors.password}
        >
          <PasswordInput
            id="login-password"
            value={form.password}
            onChange={(value) => update('password', value)}
            autoComplete="current-password"
          />
        </FormField>

        <Button type="submit" size="lg" disabled={pending !== null}>
          {pending === 'email' ? 'Signing in…' : 'Sign In'}
        </Button>

        {/* Google sign-in is the Firebase web popup flow, which cannot
            complete inside the Android WebView, so it is not offered there. */}
        {!isNativeApp() && (
          <>
            <AuthDivider />

            <GoogleSignInButton
              onClick={() => void run('google', signInWithGoogle)}
              disabled={pending !== null}
              label={
                pending === 'google' ? 'Opening Google…' : 'Continue with Google'
              }
            />
          </>
        )}
      </form>

      <p className="text-body-small text-muted-foreground">
        New here?{' '}
        <Link to={ROUTES.register} className="text-label text-primary">
          Create account
        </Link>
      </p>

      <p className="text-body-small text-muted-foreground">
        By continuing, you agree to our{' '}
        <Link to={ROUTES.privacy} className="text-label text-primary">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
