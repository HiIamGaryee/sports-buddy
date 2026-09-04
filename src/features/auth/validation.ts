export { validateDisplayName } from '@/lib/validation'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const MIN_PASSWORD_LENGTH = 6

export const validateEmail = (email: string): string | undefined => {
  const value = email.trim()
  if (!value) return 'Email is required.'
  if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email address.'
  return undefined
}

export const validateRequiredPassword = (password: string): string | undefined =>
  password ? undefined : 'Password is required.'

export const validateNewPassword = (password: string): string | undefined => {
  if (!password) return 'Password is required.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  return undefined
}

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string,
): string | undefined => {
  if (!confirmPassword) return 'Please confirm your password.'
  if (password !== confirmPassword) return 'Passwords do not match.'
  return undefined
}
