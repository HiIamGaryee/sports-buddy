import type { AuthUser, EmailCredentials, RegisterInput } from '@/types/auth'

/** Backend-agnostic authentication contract. No Firebase types cross this line. */
export interface AuthRepository {
  registerWithEmail(input: RegisterInput): Promise<AuthUser>
  signInWithEmail(credentials: EmailCredentials): Promise<AuthUser>
  signInWithGoogle(): Promise<AuthUser>
  signOut(): Promise<void>
  /**
   * Sends a password-reset email. Resolves even when no account has that
   * address: telling a caller which emails are registered would let anyone
   * enumerate the member list.
   */
  sendPasswordReset(email: string): Promise<void>
  getCurrentUser(): Promise<AuthUser | null>
  /**
   * Best-effort rollback for a just-created account whose profile document
   * failed to write. No-op if there is no signed-in user to remove.
   */
  deleteCurrentUser(): Promise<void>
  /** Returns an unsubscribe function. Emits `null` when signed out. */
  subscribeToAuthState(listener: (user: AuthUser | null) => void): () => void
}
