import { useEffect, type ComponentProps } from 'react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { LatLngExpression, LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { env } from '@/config/env'
import { cn } from '@/lib/utils'
import type { GeoPoint, Venue } from '@/types/venue'
import { GoogleVenueMap } from '@/features/planning/components/google-venue-map'

function MapController({
  center,
  venues,
  selectedVenue,
}: {
  center: GeoPoint
  venues: readonly Venue[]
  selectedVenue: Venue | null
}) {
  const map = useMap()

  useEffect(() => {
    const points: LatLngTuple[] = [
      [center.lat, center.lng],
      ...venues.map(({ location }) => [location.lat, location.lng] as LatLngTuple),
    ]
    if (venues.length === 0) map.setView([center.lat, center.lng], 14)
    else if (venues.length === 1) map.setView([venues[0].location.lat, venues[0].location.lng], 15)
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
  }, [center, map, venues])

  useEffect(() => {
    if (!selectedVenue) return
    map.flyTo(
      [selectedVenue.location.lat, selectedVenue.location.lng],
      Math.max(map.getZoom(), 15),
      { duration: 0.35 },
    )
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

/** Presentation-only OpenStreetMap view. Venue selection stays in the list. */
export function OpenStreetMapVenueMap({
  venues,
  selectedVenueId,
  center,
  onSelect,
  className,
}: {
  venues: readonly Venue[]
  selectedVenueId: string | null
  center: GeoPoint
  onSelect: (venueId: string) => void
  className?: string
}) {
  const selectedVenue = venues.find(({ id }) => id === selectedVenueId) ?? null
  const mapCenter: LatLngExpression = [center.lat, center.lng]

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border', className)}>
      <MapContainer center={mapCenter} zoom={14} scrollWheelZoom className="size-full" aria-label="Nearby venue map">
        <TileLayer
          attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} venues={venues} selectedVenue={selectedVenue} />
        <CircleMarker
          center={mapCenter}
          radius={11}
          pathOptions={{ color: 'var(--foreground)', fillColor: 'var(--primary)', fillOpacity: 1, weight: 3 }}
        >
          <Popup>Search location</Popup>
        </CircleMarker>
        {venues.map((venue) => {
          const selected = venue.id === selectedVenueId
          return (
            <CircleMarker
              key={venue.id}
              center={[venue.location.lat, venue.location.lng]}
              radius={selected ? 10 : 7}
              pathOptions={{
                color: selected ? 'var(--foreground)' : 'var(--primary)',
                fillColor: selected ? 'var(--primary)' : 'var(--surface-raised)',
                fillOpacity: 1,
                weight: selected ? 3 : 2,
              }}
              eventHandlers={{ click: () => onSelect(venue.id) }}
            >
              <Popup>
                <div className="flex max-w-48 flex-col gap-1">
                  <strong>{venue.name}</strong>
                  <span>{venue.address}</span>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

/** Keeps the existing import stable while selecting the configured map. */
export function VenueMap(props: ComponentProps<typeof OpenStreetMapVenueMap>) {
  return env.venueSource === 'google' ? <GoogleVenueMap {...props} /> : <OpenStreetMapVenueMap {...props} />
}
