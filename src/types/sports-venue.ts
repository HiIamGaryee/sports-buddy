export interface SportsVenue {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  userRatingCount?: number
  openNow?: boolean
  googleMapsUri?: string
  openStreetMapUrl?: string
  distanceKm: number
}
