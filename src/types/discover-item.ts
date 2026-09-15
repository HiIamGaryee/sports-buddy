export interface DiscoverItem {
  id: string
  buddyId: string
  location: string
  place: string
  activity: string
  skillLevel?: string
  buddyType?: string
  distanceKm?: number
  priceRange?: string
  matchPercentage?: number
  connected?: boolean
  participantRule: ParticipantRule
}

export type ParticipantRule =
  | { mode: 'exact'; sizes: number[] }
  | { mode: 'range'; min: number; max: number }
  | { mode: 'max'; min: number; max: number }
