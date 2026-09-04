import { MOCK_STORAGE_KEYS } from '@/constants/app'
import { clearStore, delay, readStore, writeStore } from '@/repositories/mock-store'
import type { AuthRepository } from '@/repositories/auth/auth-repository'
import type { AuthUser, EmailCredentials, RegisterInput } from '@/types/auth'

interface MockAccount extends AuthUser {
  password: string
}

/** Development-only credentials — documented in CLAUDE.md, never shown in the UI. */
const DEMO_ACCOUNT: MockAccount = {
  id: 'user_demo_001',
  email: 'demo@sportsbuddy.app',
  password: 'password123',
  displayName: 'Gary',
  photoUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const GOOGLE_ACCOUNT: MockAccount = {
  id: 'user_google_001',
  email: 'gary.google@sportsbuddy.app',
  password: '',
  displayName: 'Gary (Google)',
  photoUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const MIN_PASSWORD_LENGTH = 6

const authError = (code: string) => Object.assign(new Error(code), { code })

const toAuthUser = ({ password: _password, ...user }: MockAccount): AuthUser => user

function readAccounts(): MockAccount[] {
  const stored = readStore<MockAccount[]>(MOCK_STORAGE_KEYS.accounts, [])
  const seeded = [DEMO_ACCOUNT, GOOGLE_ACCOUNT].filter(
    (seed) => !stored.some((account) => account.email === seed.email),
  )
  return [...seeded, ...stored]
}

function saveAccount(account: MockAccount) {
  const accounts = readStore<MockAccount[]>(MOCK_STORAGE_KEYS.accounts, [])
  writeStore(MOCK_STORAGE_KEYS.accounts, [...accounts, account])
}

const listeners = new Set<(user: AuthUser | null) => void>()

function setSession(user: AuthUser | null) {
  if (user) writeStore(MOCK_STORAGE_KEYS.session, user)
  else clearStore(MOCK_STORAGE_KEYS.session)
  listeners.forEach((listener) => listener(user))
}

const readSession = () => readStore<AuthUser | null>(MOCK_STORAGE_KEYS.session, null)

export const mockAuthRepository: AuthRepository = {
  async registerWithEmail({ displayName, email, password }: RegisterInput) {
    await delay(null)
    if (password.length < MIN_PASSWORD_LENGTH) throw authError('auth/weak-password')
    if (readAccounts().some((account) => account.email === email)) {
      throw authError('auth/email-already-in-use')
    }

    const account: MockAccount = {
      id: `user_${Date.now()}`,
      email,
      password,
      displayName,
      photoUrl: null,
      createdAt: new Date().toISOString(),
    }
    saveAccount(account)

    const user = toAuthUser(account)
    setSession(user)
    return user
  },

  async signInWithEmail({ email, password }: EmailCredentials) {
    await delay(null)
    const account = readAccounts().find(
      (candidate) => candidate.email === email && candidate.password === password,
    )
    if (!account) throw authError('auth/invalid-credential')

    const user = toAuthUser(account)
    setSession(user)
    return user
  },

  async signInWithGoogle() {
    await delay(null)
    const account =
      readAccounts().find((candidate) => candidate.email === GOOGLE_ACCOUNT.email) ??
      GOOGLE_ACCOUNT
    const user = toAuthUser(account)
    setSession(user)
    return user
  },

  async signOut() {
    await delay(null, 150)
    setSession(null)
  },

  async getCurrentUser() {
    return readSession()
  },

  subscribeToAuthState(listener) {
    listeners.add(listener)
    listener(readSession())
    return () => listeners.delete(listener)
  },
}
