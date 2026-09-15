import { useCallback, useState } from 'react'

import { resolveLocation, searchSportsVenues } from '@/services/openstreetmap/openstreetmap-service'
import type { SportId } from '@/types/sports-profile'
import type { SportsVenue } from '@/types/sports-venue'

export type VenueMapSearchStatus = 'idle' | 'loading' | 'searched' | 'error'

export function useVenueMapSearch({
  initialLocation = 'Puchong',
  initialSportId = 'badminton',
  initialRadius = 10,
}: {
  initialLocation?: string
  initialSportId?: SportId
  initialRadius?: number
} = {}) {
  const [location, setLocation] = useState(initialLocation)
  const [sportId, setSportId] = useState<SportId>(initialSportId)
  const [radius, setRadius] = useState(initialRadius)
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [venues, setVenues] = useState<SportsVenue[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchId, setSearchId] = useState(0)
  const [status, setStatus] = useState<VenueMapSearchStatus>('idle')
  const [error, setError] = useState('')

  const search = useCallback(async (query = location) => {
    const locationQuery = query.trim()
    if (!locationQuery) return
    setLocation(locationQuery)
    setStatus('loading')
    setError('')

    try {
      const resolvedLocation = await resolveLocation(locationQuery)
      if (!resolvedLocation) {
        setStatus('error')
        setError('Location not found. Try a more specific area name.')
        return
      }

      const foundVenues = await searchSportsVenues({
        sportId,
        locationQuery,
        location: resolvedLocation,
        radiusMeters: radius * 1_000,
      })
      setSearchLocation(resolvedLocation)
      setVenues(foundVenues)
      setSelectedId(null)
      setSearchId((value) => value + 1)
      setStatus('searched')
    } catch {
      setStatus('error')
      setError('Could not load nearby venues. Please try again.')
    }
  }, [location, radius, sportId])

  return {
    location,
    setLocation,
    sportId,
    setSportId,
    radius,
    setRadius,
    searchLocation,
    venues,
    selectedId,
    setSelectedId,
    searchId,
    status,
    error,
    search,
  }
}
