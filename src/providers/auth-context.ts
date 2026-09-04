import { createContext } from 'react'

import type { AuthUser, EmailCredentials, RegisterInput } from '@/types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (credentials: EmailCredentials) => Promise<void>
  signUp: (input: RegisterInput) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
