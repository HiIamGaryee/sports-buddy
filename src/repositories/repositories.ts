import { env } from '@/config/env'
import { firebaseAuthRepository } from '@/repositories/auth/firebase-auth-repository'
import { mockAuthRepository } from '@/repositories/auth/mock-auth-repository'
import { firebaseDiscoverRepository } from '@/repositories/discover/firebase-discover-repository'
import { mockDiscoverRepository } from '@/repositories/discover/mock-discover-repository'
import { firebaseProfileRepository } from '@/repositories/profile/firebase-profile-repository'
import { mockProfileRepository } from '@/repositories/profile/mock-profile-repository'
import { firebasePublicProfileRepository } from '@/repositories/public-profile/firebase-public-profile-repository'
import { mockPublicProfileRepository } from '@/repositories/public-profile/mock-public-profile-repository'

/** The single place the backend is chosen. Nothing else reads env.dataSource. */
const useFirebase = env.dataSource === 'firebase'

export const authRepository = useFirebase
  ? firebaseAuthRepository
  : mockAuthRepository

/** Private `users/{uid}`. */
export const profileRepository = useFirebase
  ? firebaseProfileRepository
  : mockProfileRepository

/** Write side of the discovery-safe `publicProfiles/{uid}` projection. */
export const publicProfileRepository = useFirebase
  ? firebasePublicProfileRepository
  : mockPublicProfileRepository

/** Read side of `publicProfiles` for browsing other people. */
export const discoverRepository = useFirebase
  ? firebaseDiscoverRepository
  : mockDiscoverRepository
