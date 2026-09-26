import type {
  ActivityIntensity,
  AreaId,
  AvailabilitySlot,
  BudgetPreference,
  SportsIntent,
  UserSport,
} from '@/types/sports-profile'
import type { Gender } from '@/types/gender'

/**
 * DISCOVERY-SAFE projection of a profile — the document stored in
 * `publicProfiles/{uid}` and the only shape that may ever be shown to another
 * user. It intentionally has no email, no account metadata, no preferences and
 * no travel radius (that stays a private filter). See
 * `src/lib/discovery-profile.ts` for the allowlist mapper.
 */
export interface DiscoveryProfile {
  userId: string
  displayName: string
  photoUrl: string | null
  gender: Gender | null
  bio: string
  instagramUsername?: string
  linkedinUsername?: string
  sports: UserSport[]
  intents: SportsIntent[]
  preferredIntensity: ActivityIntensity | null
  availability: AvailabilitySlot[]
  area: AreaId | null
  budget: BudgetPreference | null
  profileCompleteness: number
  /** Kept on the document so a stale projection can still be filtered out. */
  discoverable: boolean
  updatedAt: string
}
