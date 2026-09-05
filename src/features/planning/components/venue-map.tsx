import { useEffect, useRef, useState } from 'react'

import { loadGoogleMaps } from '@/services/google/maps-loader'
import { cn } from '@/lib/utils'
import type { GeoPoint, Venue } from '@/types/venue'

/**
 * Presentation only. It draws venues and reports a click — it never searches,
 * never touches a plan and never sees Firebase.
 *
 * The map is an ENHANCEMENT: if it fails to load, the parent still renders
 * the full venue list, and every venue remains selectable from it.
 *
 * Marker colours are read from the live theme tokens rather than hardcoded,
 * because the Maps API needs real colour strings and cannot take a class.
 */
function themeColor(token: string, fallback: string) {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim()
  return value || fallback
}

export function VenueMap({
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let active = true

    loadGoogleMaps()
      .then((maps) => {
        if (!active || !containerRef.current) return
        mapRef.current ??= new maps.Map(containerRef.current, {
          center,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        })
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('failed')
      })

    return () => {
      active = false
    }
    // The map is created once; markers and bounds are synced separately.
  }, [center])

  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map) return

    const markers = markersRef.current
    const primary = themeColor('--primary', '#c4ff3d')
    const muted = themeColor('--muted-foreground', '#9ba1ae')
    const outline = themeColor('--background', '#0b0c10')

    // Drop markers for venues that are no longer in the results.
    for (const [id, marker] of markers) {
      if (!venues.some((venue) => venue.id === id)) {
        marker.setMap(null)
        markers.delete(id)
      }
    }

    const bounds = new google.maps.LatLngBounds()
    for (const venue of venues) {
      const isSelected = venue.id === selectedVenueId
      const icon: google.maps.Symbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 11 : 7,
        fillColor: isSelected ? primary : muted,
        fillOpacity: 1,
        strokeColor: outline,
        strokeWeight: 2,
      }

      const existing = markers.get(venue.id)
      if (existing) {
        existing.setIcon(icon)
        existing.setZIndex(isSelected ? 2 : 1)
      } else {
        const marker = new google.maps.Marker({
          map,
          position: venue.location,
          title: venue.name,
          icon,
          zIndex: isSelected ? 2 : 1,
        })
        marker.addListener('click', () => onSelect(venue.id))
        markers.set(venue.id, marker)
      }
      bounds.extend(venue.location)
    }

    if (venues.length > 0) map.fitBounds(bounds, 48)
  }, [venues, selectedVenueId, status, onSelect])

  // Keep the selected venue in view when it is chosen from the list.
  useEffect(() => {
    const map = mapRef.current
    if (status !== 'ready' || !map || !selectedVenueId) return
    const venue = venues.find((entry) => entry.id === selectedVenueId)
    if (venue) map.panTo(venue.location)
  }, [selectedVenueId, venues, status])

  if (status === 'failed') return null

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-border', className)}>
      <div ref={containerRef} className="size-full" aria-hidden />
      {status === 'loading' && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-muted">
          <span className="text-body-small text-muted-foreground">
            Loading map…
          </span>
        </div>
      )}
    </div>
  )
}
