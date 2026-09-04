/** The only shape of "who is signed in" the application knows about. */
export interface AuthUser {
  id: string
  email: string
  displayName: string
  photoUrl: string | null
  createdAt: string
}

export interface EmailCredentials {
  email: string
  password: string
}

export interface RegisterInput extends EmailCredentials {
  displayName: string
}
