import type { AuthUser, EmailCredentials, RegisterInput } from '@/types/auth'

/** Backend-agnostic authentication contract. No Firebase types cross this line. */
export interface AuthRepository {
  registerWithEmail(input: RegisterInput): Promise<AuthUser>
  signInWithEmail(credentials: EmailCredentials): Promise<AuthUser>
  signInWithGoogle(): Promise<AuthUser>
  signOut(): Promise<void>
  getCurrentUser(): Promise<AuthUser | null>
  /** Returns an unsubscribe function. Emits `null` when signed out. */
  subscribeToAuthState(listener: (user: AuthUser | null) => void): () => void
}
