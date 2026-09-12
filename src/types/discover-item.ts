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
}
