import { useEffect } from 'react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression, LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { SportsVenue } from '@/types/sports-venue'

function MapController({
  searchId,
  searchLocation,
  venues,
  selectedVenue,
}: {
  searchId: number
  searchLocation: LatLngExpression
  venues: readonly SportsVenue[]
  selectedVenue: SportsVenue | null
}) {
  const map = useMap()

  useEffect(() => {
    const points: LatLngTuple[] = [
      searchLocation as LatLngTuple,
      ...venues.map(({ lat, lng }) => [lat, lng] as LatLngTuple),
    ]

    if (venues.length === 0) {
      map.setView(searchLocation, 14)
    } else if (venues.length === 1) {
      map.setView([venues[0].lat, venues[0].lng], 15)
    } else {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
    }
  }, [map, searchId, searchLocation, venues])

  useEffect(() => {
    if (!selectedVenue) return
    map.flyTo([selectedVenue.lat, selectedVenue.lng], Math.max(map.getZoom(), 15), {
      duration: 0.35,
    })
  }, [map, selectedVenue])

  useEffect(() => {
    const invalidate = () => map.invalidateSize({ pan: false })
    const timeout = window.setTimeout(invalidate, 100)
    const observer = new ResizeObserver(invalidate)
    observer.observe(map.getContainer())

    return () => {
      window.clearTimeout(timeout)
      observer.disconnect()
    }
  }, [map])

  return null
}

export function VenueMap({
  searchId,
  searchLocation,
  venues,
  selectedId,
  onSelect,
}: {
  searchId: number
  searchLocation: { lat: number; lng: number }
  venues: readonly SportsVenue[]
  selectedId: string | null
  onSelect: (venueId: string) => void
}) {
  const selectedVenue = venues.find(({ id }) => id === selectedId) ?? null
  const searchPoint: LatLngExpression = [searchLocation.lat, searchLocation.lng]

  return (
    <MapContainer
      center={searchPoint}
      zoom={14}
      scrollWheelZoom
      className="h-75 w-full lg:h-150"
      aria-label="Nearby venue map"
    >
      <TileLayer
        attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController
        searchId={searchId}
        searchLocation={searchPoint}
        venues={venues}
        selectedVenue={selectedVenue}
      />
      <CircleMarker
        center={searchPoint}
        radius={11}
        pathOptions={{ color: 'var(--foreground)', fillColor: 'var(--primary)', fillOpacity: 1, weight: 3 }}
      >
        <Popup className="sports-buddy-map-popup">Search location</Popup>
      </CircleMarker>
      {venues.map((venue) => {
        const selected = venue.id === selectedId

        return (
          <CircleMarker
            key={venue.id}
            center={[venue.lat, venue.lng]}
            radius={selected ? 10 : 7}
            pathOptions={{
              color: selected ? 'var(--foreground)' : 'var(--primary)',
              fillColor: selected ? 'var(--primary)' : 'var(--surface-raised)',
              fillOpacity: 1,
              weight: selected ? 3 : 2,
            }}
            eventHandlers={{ click: () => onSelect(venue.id) }}
          >
            <Popup className="sports-buddy-map-popup">
              <div className="flex max-w-48 flex-col gap-1">
                <strong>{venue.name}</strong>
                <span>{venue.address}</span>
                <span>{venue.distanceKm < 1 ? `${Math.round(venue.distanceKm * 1_000)} m` : `${venue.distanceKm.toFixed(1)} km`} away</span>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
