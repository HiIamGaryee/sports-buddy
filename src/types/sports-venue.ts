export interface SportsVenue {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  userRatingCount?: number
  openNow?: boolean
  openStreetMapUrl?: string
  googleMapsUri?: string
  distanceKm: number
}
