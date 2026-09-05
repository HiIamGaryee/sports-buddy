import { env } from '@/config/env'
import { firebaseAuthRepository } from '@/repositories/auth/firebase-auth-repository'
import { mockAuthRepository } from '@/repositories/auth/mock-auth-repository'
import { firebaseActivityRepository } from '@/repositories/activity/firebase-activity-repository'
import { mockActivityRepository } from '@/repositories/activity/mock-activity-repository'
import { firebaseActivityPlanRepository } from '@/repositories/activity-plan/firebase-activity-plan-repository'
import { mockActivityPlanRepository } from '@/repositories/activity-plan/mock-activity-plan-repository'
import { firebaseChatRepository } from '@/repositories/chat/firebase-chat-repository'
import { mockChatRepository } from '@/repositories/chat/mock-chat-repository'
import { firebaseConnectionRepository } from '@/repositories/connection/firebase-connection-repository'
import { mockConnectionRepository } from '@/repositories/connection/mock-connection-repository'
import { firebaseDiscoverRepository } from '@/repositories/discover/firebase-discover-repository'
import { mockDiscoverRepository } from '@/repositories/discover/mock-discover-repository'
import { firebaseProfileRepository } from '@/repositories/profile/firebase-profile-repository'
import { mockProfileRepository } from '@/repositories/profile/mock-profile-repository'
import { firebasePublicProfileRepository } from '@/repositories/public-profile/firebase-public-profile-repository'
import { mockPublicProfileRepository } from '@/repositories/public-profile/mock-public-profile-repository'
import { googleVenueRepository } from '@/repositories/venue/google-venue-repository'
import { mockVenueRepository } from '@/repositories/venue/mock-venue-repository'

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

/** `connections/{pairId}` — relationship state, participants only. */
export const connectionRepository = useFirebase
  ? firebaseConnectionRepository
  : mockConnectionRepository

/** `conversations/{connectionId}` and its `messages` subcollection. */
export const chatRepository = useFirebase
  ? firebaseChatRepository
  : mockChatRepository

/** `activityPlans/{connectionId}__active` — the shared session plan. */
export const activityPlanRepository = useFirebase
  ? firebaseActivityPlanRepository
  : mockActivityPlanRepository

/** `activities/{planId}` — the confirmed, immutable event. */
export const activityRepository = useFirebase
  ? firebaseActivityRepository
  : mockActivityRepository

/**
 * Venue discovery, chosen from `env.venueSource` INDEPENDENTLY of the
 * backend — Firebase plus mock venues is a normal development setup. This is
 * the one place the provider is selected; no component branches on it.
 */
export const venueRepository =
  env.venueSource === 'google' ? googleVenueRepository : mockVenueRepository
