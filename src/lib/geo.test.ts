import { describe, expect, it } from 'vitest'

import { AREAS, getAreaCenter } from '@/constants/areas'
import {
  MAX_VENUE_SEARCH_RADIUS_METERS,
  MIN_VENUE_SEARCH_RADIUS_METERS,
} from '@/constants/venues'
import {
  buildOpenStreetMapUrl,
  calculateHaversineDistance,
  calculateMidpoint,
  deriveVenueSearchRadius,
  formatDistance,
  isValidCoordinate,
} from '@/lib/geo'

const SUBANG = { lat: 3.0568, lng: 101.5851 }
const PJ = { lat: 3.1073, lng: 101.6067 }

describe('isValidCoordinate', () => {
  it('accepts a real point', () => {
    expect(isValidCoordinate(SUBANG)).toBe(true)
    expect(isValidCoordinate({ lat: 0, lng: 0 })).toBe(true)
    expect(isValidCoordinate({ lat: -90, lng: 180 })).toBe(true)
  })

  it('rejects an out-of-range latitude', () => {
    expect(isValidCoordinate({ lat: 91, lng: 0 })).toBe(false)
    expect(isValidCoordinate({ lat: -90.1, lng: 0 })).toBe(false)
  })

  it('rejects an out-of-range longitude', () => {
    expect(isValidCoordinate({ lat: 0, lng: 181 })).toBe(false)
    expect(isValidCoordinate({ lat: 0, lng: -180.5 })).toBe(false)
  })

  it('rejects NaN, missing and null', () => {
    expect(isValidCoordinate({ lat: Number.NaN, lng: 0 })).toBe(false)
    expect(isValidCoordinate({ lat: 0, lng: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isValidCoordinate(null)).toBe(false)
    expect(isValidCoordinate(undefined)).toBe(false)
  })
})

describe('calculateMidpoint', () => {
  it('returns the same point for two identical points', () => {
    expect(calculateMidpoint(SUBANG, SUBANG)).toEqual(SUBANG)
  })

  it('sits exactly between two different points', () => {
    const midpoint = calculateMidpoint(SUBANG, PJ)
    expect(midpoint.lat).toBeCloseTo((SUBANG.lat + PJ.lat) / 2, 6)
    expect(midpoint.lng).toBeCloseTo((SUBANG.lng + PJ.lng) / 2, 6)
    // Genuinely between the two, not at either end.
    expect(midpoint.lat).toBeGreaterThan(SUBANG.lat)
    expect(midpoint.lat).toBeLessThan(PJ.lat)
  })

  it('is symmetric', () => {
    expect(calculateMidpoint(SUBANG, PJ)).toEqual(calculateMidpoint(PJ, SUBANG))
  })
})

describe('calculateHaversineDistance', () => {
  it('is zero for identical coordinates', () => {
    expect(calculateHaversineDistance(SUBANG, SUBANG)).toBe(0)
  })

  it('is positive for different coordinates', () => {
    expect(calculateHaversineDistance(SUBANG, PJ)).toBeGreaterThan(0)
  })

  it('is symmetric', () => {
    expect(calculateHaversineDistance(SUBANG, PJ)).toBeCloseTo(
      calculateHaversineDistance(PJ, SUBANG),
      6,
    )
  })

  it('is roughly right for two known Klang Valley areas', () => {
    // Subang Jaya to Petaling Jaya is a handful of kilometres.
    const meters = calculateHaversineDistance(SUBANG, PJ)
    expect(meters).toBeGreaterThan(4_000)
    expect(meters).toBeLessThan(10_000)
  })
})

describe('deriveVenueSearchRadius', () => {
  it('stays within its floor and ceiling', () => {
    const same = deriveVenueSearchRadius(SUBANG, SUBANG)
    expect(same).toBeGreaterThanOrEqual(MIN_VENUE_SEARCH_RADIUS_METERS)
    expect(same).toBeLessThanOrEqual(MAX_VENUE_SEARCH_RADIUS_METERS)

    const far = deriveVenueSearchRadius(
      { lat: 3.0298, lng: 101.6178 },
      { lat: 3.2167, lng: 101.6333 },
    )
    expect(far).toBeLessThanOrEqual(MAX_VENUE_SEARCH_RADIUS_METERS)
  })

  it('widens as the two areas get further apart', () => {
    const near = deriveVenueSearchRadius(SUBANG, SUBANG)
    const far = deriveVenueSearchRadius(SUBANG, { lat: 3.2167, lng: 101.6333 })
    expect(far).toBeGreaterThan(near)
  })
})

describe('area centres', () => {
  it('exist and are valid for every area', () => {
    for (const area of AREAS) {
      expect(isValidCoordinate(area.center)).toBe(true)
      expect(getAreaCenter(area.id)).toEqual(area.center)
    }
  })

  it('returns null for a missing area', () => {
    expect(getAreaCenter(null)).toBeNull()
  })
})

describe('formatDistance', () => {
  it('uses metres below a kilometre and kilometres above', () => {
    expect(formatDistance(820)).toBe('800 m')
    expect(formatDistance(2_140)).toBe('2.1 km')
  })

  it('returns nothing for a nonsense value', () => {
    expect(formatDistance(Number.NaN)).toBe('')
    expect(formatDistance(-5)).toBe('')
  })
})

describe('buildOpenStreetMapUrl', () => {
  it('opens the venue coordinates in OpenStreetMap', () => {
    const url = buildOpenStreetMapUrl({ location: PJ })
    expect(url).toContain('www.openstreetmap.org')
    expect(url).toContain(`mlat=${PJ.lat}`)
    expect(url).toContain(`mlon=${PJ.lng}`)
  })
})
