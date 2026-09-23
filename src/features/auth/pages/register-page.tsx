import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ChoiceChip } from '@/components/ui/choice-chip'
import { Input } from '@/components/ui/input'
import { AuthAlert } from '@/features/auth/components/auth-alert'
import { AuthDivider } from '@/features/auth/components/auth-divider'
import { FormField } from '@/components/common/form-field'
import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button'
import { PasswordInput } from '@/features/auth/components/password-input'
import {
  validateConfirmPassword,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  validateGender,
} from '@/features/auth/validation'
import { useAuth } from '@/hooks/use-auth'
import { APP_TAGLINE_LINES } from '@/constants/app'
import { isNativeApp } from '@/lib/platform'
import { ROUTES } from '@/routes/routes'
import { GENDER_OPTIONS } from '@/types/gender'
import type { Gender } from '@/types/gender'

interface RegisterForm {
  displayName: string
  email: string
  password: string
  confirmPassword: string
  gender: Gender | null
}

type FieldErrors = Partial<Record<keyof RegisterForm, string>>
type Pending = 'email' | 'google' | null

const EMPTY_FORM: RegisterForm = {
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
  gender: null,
}

export function RegisterPage() {
  const { signUp, signInWithGoogle } = useAuth()
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [pending, setPending] = useState<Pending>(null)

  const update = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) =>
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
      displayName: validateDisplayName(form.displayName),
      email: validateEmail(form.email),
      password: validateNewPassword(form.password),
      confirmPassword: validateConfirmPassword(
        form.password,
        form.confirmPassword,
      ),
      gender: validateGender(form.gender),
    }
    setFieldErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    await run('email', () =>
      signUp({
        displayName: form.displayName,
        email: form.email,
        password: form.password,
        gender: form.gender as Gender,
      }),
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-display text-foreground">
          {APP_TAGLINE_LINES.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="text-body text-muted-foreground">
          Create your account to meet buddies who play what you play.
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        {formError && <AuthAlert message={formError} />}

        <FormField
          id="register-name"
          label="Display name"
          error={fieldErrors.displayName}
        >
          <Input
            id="register-name"
            value={form.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            autoComplete="name"
            placeholder="Gary"
          />
        </FormField>

        <FormField id="register-gender" label="Gender" error={fieldErrors.gender}>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Gender">
            {GENDER_OPTIONS.map(({ value, label }) => (
              <ChoiceChip
                key={value}
                label={label}
                selection="single"
                selected={form.gender === value}
                onClick={() => update('gender', value)}
                className="w-full rounded-xl"
              />
            ))}
          </div>
          <p className="text-body-small text-muted-foreground">Gender can&apos;t be changed after account creation.</p>
        </FormField>

        <FormField id="register-email" label="Email" error={fieldErrors.email}>
          <Input
            id="register-email"
            type="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            autoComplete="email"
            inputMode="email"
            placeholder="you@email.com"
          />
        </FormField>

        <FormField
          id="register-password"
          label="Password"
          error={fieldErrors.password}
        >
          <PasswordInput
            id="register-password"
            value={form.password}
            onChange={(value) => update('password', value)}
            autoComplete="new-password"
          />
        </FormField>

        <FormField
          id="register-confirm"
          label="Confirm password"
          error={fieldErrors.confirmPassword}
        >
          <PasswordInput
            id="register-confirm"
            value={form.confirmPassword}
            onChange={(value) => update('confirmPassword', value)}
            autoComplete="new-password"
          />
        </FormField>

        <Button type="submit" size="lg" disabled={pending !== null}>
          {pending === 'email' ? 'Creating account…' : 'Create Account'}
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
        Already have an account?{' '}
        <Link to={ROUTES.login} className="text-label text-primary">
          Sign in
        </Link>
      </p>

      <p className="text-body-small text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link to={ROUTES.privacy} className="text-label text-primary">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
