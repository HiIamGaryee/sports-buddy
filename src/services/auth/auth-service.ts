import { authRepository, profileRepository } from '@/repositories/repositories'
import {
  isCancelledAuthError,
  toAuthError,
} from '@/services/auth/auth-error'
import type { AuthUser, EmailCredentials, RegisterInput } from '@/types/auth'
import { isGender } from '@/types/gender'

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/**
 * Thin application layer: normalizes input, guarantees the minimal user
 * document exists on first sign-in, and converts backend errors into
 * user-safe messages. No React state lives here.
 */
export const authService = {
  async signUp({ displayName, email, password, gender }: RegisterInput): Promise<AuthUser> {
    try {
      if (!isGender(gender)) throw new Error('Choose a valid gender.')
      const user = await authRepository.registerWithEmail({
        displayName: displayName.trim(),
        email: normalizeEmail(email),
        password,
        gender,
      })
      await profileRepository.createIfMissing(user, gender)
      return user
    } catch (error) {
      throw toAuthError(error)
    }
  },

  async signIn({ email, password }: EmailCredentials): Promise<AuthUser> {
    try {
      return await authRepository.signInWithEmail({
        email: normalizeEmail(email),
        password,
      })
    } catch (error) {
      throw toAuthError(error)
    }
  },

  /** Resolves `null` when the user closed the Google popup themselves. */
  async signInWithGoogle(): Promise<AuthUser | null> {
    try {
      const user = await authRepository.signInWithGoogle()
      await profileRepository.createIfMissing(user, null)
      return user
    } catch (error) {
      if (isCancelledAuthError(error)) return null
      throw toAuthError(error)
    }
  },

  async signOut(): Promise<void> {
    try {
      await authRepository.signOut()
    } catch (error) {
      throw toAuthError(error)
    }
  },

  subscribeToAuthState(listener: (user: AuthUser | null) => void) {
    return authRepository.subscribeToAuthState(listener)
  },
}
