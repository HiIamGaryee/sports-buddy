import { useCallback, useEffect, useMemo, useState } from 'react'

import { AuthContext } from '@/providers/auth-context'
import { authService } from '@/services/auth/auth-service'
import type { AuthUser, EmailCredentials, RegisterInput } from '@/types/auth'

/** The single source of truth for authentication state in the app. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthState((nextUser) => {
      setUser(nextUser)
      setIsLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = useCallback(async (credentials: EmailCredentials) => {
    setUser(await authService.signIn(credentials))
  }, [])

  const signUp = useCallback(async (input: RegisterInput) => {
    setUser(await authService.signUp(input))
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const nextUser = await authService.signInWithGoogle()
    if (nextUser) setUser(nextUser)
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
