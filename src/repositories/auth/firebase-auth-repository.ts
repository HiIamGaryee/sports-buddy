import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'

import type { AuthRepository } from '@/repositories/auth/auth-repository'
import { getFirebaseAuth } from '@/services/firebase/client'
import type { AuthUser, EmailCredentials, RegisterInput } from '@/types/auth'

function toAuthUser(user: FirebaseUser): AuthUser {
  return {
    id: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Buddy',
    photoUrl: user.photoURL,
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : new Date().toISOString(),
  }
}

export const firebaseAuthRepository: AuthRepository = {
  async registerWithEmail({ displayName, email, password }: RegisterInput) {
    const auth = getFirebaseAuth()
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName })
    return { ...toAuthUser(user), displayName }
  },

  async signInWithEmail({ email, password }: EmailCredentials) {
    const { user } = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email,
      password,
    )
    return toAuthUser(user)
  },

  async signInWithGoogle() {
    const { user } = await signInWithPopup(
      getFirebaseAuth(),
      new GoogleAuthProvider(),
    )
    return toAuthUser(user)
  },

  signOut() {
    return firebaseSignOut(getFirebaseAuth())
  },

  sendPasswordReset(email) {
    return sendPasswordResetEmail(getFirebaseAuth(), email)
  },

  async deleteCurrentUser() {
    const { currentUser } = getFirebaseAuth()
    if (!currentUser) return
    try {
      await deleteUser(currentUser)
    } catch {
      // Best-effort rollback only; leave the account for the user to retry signing into.
    }
  },

  async getCurrentUser() {
    const { currentUser } = getFirebaseAuth()
    return currentUser ? toAuthUser(currentUser) : null
  },

  subscribeToAuthState(listener) {
    return onAuthStateChanged(getFirebaseAuth(), (user) =>
      listener(user ? toAuthUser(user) : null),
    )
  },
}
