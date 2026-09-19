import { describe, expect, it } from 'vitest'

import { getAreaCenter } from '@/constants/areas'
import {
  FALLBACK_VENUE_SEARCH,
  SPORT_VENUE_SEARCH,
  VENUE_RESULT_LIMIT,
} from '@/constants/venues'
import { calculateHaversineDistance, calculateMidpoint } from '@/lib/geo'
import { MOCK_VENUES } from '@/repositories/venue/mock-venues'
import { venueService } from '@/services/venue/venue-service'
import { VenueError } from '@/services/venue/venue-error'
import type { Venue } from '@/types/venue'

const SPORTS_WITH_SEARCH = Object.keys(SPORT_VENUE_SEARCH) as (keyof typeof SPORT_VENUE_SEARCH)[]

describe('search area', () => {
  it('is the midpoint of the two public AREA centres', () => {
    const area = venueService.getSearchArea('subang-jaya', 'petaling-jaya')
    const expected = calculateMidpoint(
      getAreaCenter('subang-jaya')!,
      getAreaCenter('petaling-jaya')!,
    )

    expect(area?.center.lat).toBeCloseTo(expected.lat, 6)
    expect(area?.center.lng).toBeCloseTo(expected.lng, 6)
    expect(area?.radiusMeters).toBeGreaterThan(0)
  })

  it('lists both areas, or one when they match', () => {
    expect(
      venueService.getSearchArea('subang-jaya', 'petaling-jaya')?.areaIds,
    ).toEqual(['subang-jaya', 'petaling-jaya'])
    expect(
      venueService.getSearchArea('subang-jaya', 'subang-jaya')?.areaIds,
    ).toEqual(['subang-jaya'])
  })

  it('is null when either person has no area', () => {
    expect(venueService.getSearchArea(null, 'petaling-jaya')).toBeNull()
    expect(venueService.getSearchArea('subang-jaya', null)).toBeNull()
  })

  it('needs no device position of any kind', () => {
    // The whole input is two area ids from the two profiles.
    expect(venueService.getSearchArea('cheras', 'kepong')).not.toBeNull()
  })
})

describe('search labels', () => {
  it('has a term set for every sport the app knows', () => {
    for (const sportId of SPORTS_WITH_SEARCH) {
      expect(SPORT_VENUE_SEARCH[sportId].terms.length).toBeGreaterThan(0)
      expect(venueService.getSearchLabel(sportId)).toBeTruthy()
    }
  })

  it('maps sports without a commercial venue to public spaces', () => {
    expect(SPORT_VENUE_SEARCH.running.terms).toContain('park')
    expect(SPORT_VENUE_SEARCH.running.terms).toContain('running track')
  })

  it('falls back for an unmapped sport', () => {
    const unknown = 'kabaddi' as keyof typeof SPORT_VENUE_SEARCH
    expect(venueService.getSearchLabel(unknown)).toBe(
      FALLBACK_VENUE_SEARCH.label,
    )
  })
})

describe('search', () => {
  const area = venueService.getSearchArea('subang-jaya', 'petaling-jaya')!

  it('returns only venues that suit the sport', async () => {
    const { venues } = await venueService.search('climbing', area)
    expect(venues.length).toBeGreaterThan(0)
    for (const venue of venues) {
      const source = MOCK_VENUES.find((entry) => entry.id === venue.id)
      expect(source?.sports).toContain('climbing')
    }
  })

  it('orders by distance from the search area', async () => {
    const { venues } = await venueService.search('badminton', area)
    const distances = venues.map((venue) =>
      calculateHaversineDistance(area.center, venue.location),
    )
    expect([...distances].sort((a, b) => a - b)).toEqual(distances)
  })

  it('respects the result limit', async () => {
    const { venues } = await venueService.search('badminton', area)
    expect(venues.length).toBeLessThanOrEqual(VENUE_RESULT_LIMIT)
  })

  it('narrows on a manual query', async () => {
    const { venues } = await venueService.search('badminton', area, 'Cheras')
    expect(venues).toHaveLength(1)
    expect(venues[0].name).toContain('Cheras')
  })

  it('returns nothing rather than inventing results', async () => {
    const { venues } = await venueService.search(
      'badminton',
      area,
      'definitely-not-a-real-place',
    )
    expect(venues).toEqual([])
  })

  it('carries no price data, because none is reliable', async () => {
    const { venues } = await venueService.search('badminton', area)
    for (const venue of venues) expect(venue.priceLevel).toBeNull()
  })
})

describe('toSelection', () => {
  const venue: Venue = {
    id: 'place_1',
    name: '  PJ Racquet Club  ',
    address: '  Jalan 13/6, Petaling Jaya  ',
    location: { lat: 3.1096, lng: 101.6371 },
    openStreetMapUrl: 'https://www.openstreetmap.org/?mlat=3.1096&mlon=101.6371#map=17/3.1096/101.6371',
    rating: 4.5,
    ratingCount: 421,
    primaryType: 'sports_club',
    priceLevel: 'PRICE_LEVEL_MODERATE',
    businessStatus: 'OPERATIONAL',
  }

  it('keeps only the stable snapshot fields', () => {
    const selection = venueService.toSelection(venue)
    expect(selection).toEqual({
      placeId: 'place_1',
      name: 'PJ Racquet Club',
      address: 'Jalan 13/6, Petaling Jaya',
      location: { lat: 3.1096, lng: 101.6371 },
      openStreetMapUrl: 'https://www.openstreetmap.org/?mlat=3.1096&mlon=101.6371#map=17/3.1096/101.6371',
    })
    // Ratings, categories and price bands go stale and are not agreed to.
    expect(Object.keys(selection)).not.toContain('rating')
    expect(Object.keys(selection)).not.toContain('priceLevel')
    expect(Object.keys(selection)).not.toContain('primaryType')
  })

  it('builds a maps link when the provider gives none', () => {
    const selection = venueService.toSelection({
      ...venue,
      openStreetMapUrl: null,
    })
    expect(selection.openStreetMapUrl).toContain('openstreetmap.org')
  })

  it('refuses a venue with impossible coordinates', () => {
    expect(() =>
      venueService.toSelection({ ...venue, location: { lat: 99, lng: 0 } }),
    ).toThrow(VenueError)
  })

  it('refuses a venue with no name or id', () => {
    expect(() => venueService.toSelection({ ...venue, name: '  ' })).toThrow(
      VenueError,
    )
    expect(() => venueService.toSelection({ ...venue, id: '' })).toThrow(
      VenueError,
    )
  })
})

describe('isValidSelection', () => {
  const selection = {
    placeId: 'place_1',
    name: 'PJ Racquet Club',
    address: 'Jalan 13/6',
    location: { lat: 3.1096, lng: 101.6371 },
    openStreetMapUrl: null,
  }

  it('accepts a well-formed snapshot', () => {
    expect(venueService.isValidSelection(selection)).toBe(true)
  })

  it('rejects missing, empty and out-of-range values', () => {
    expect(venueService.isValidSelection(null)).toBe(false)
    expect(venueService.isValidSelection({ ...selection, placeId: '' })).toBe(false)
    expect(venueService.isValidSelection({ ...selection, name: '   ' })).toBe(false)
    expect(
      venueService.isValidSelection({
        ...selection,
        location: { lat: Number.NaN, lng: 0 },
      }),
    ).toBe(false)
    expect(
      venueService.isValidSelection({
        ...selection,
        location: { lat: 0, lng: 200 },
      }),
    ).toBe(false)
  })

  /**
   * A venue selection is written into a SHARED plan document, so the other
   * participant renders whatever is stored. These are the fields an attacker
   * would reach for.
   */
  it('rejects a maps URI that is not a real OpenStreetMap link', () => {
    expect(
      venueService.isValidSelection({
        ...selection,
        openStreetMapUrl: 'javascript:alert(1)',
      }),
    ).toBe(false)
    expect(
      venueService.isValidSelection({
        ...selection,
        openStreetMapUrl: 'https://phishing.example.com/maps',
      }),
    ).toBe(false)
    expect(
      venueService.isValidSelection({
        ...selection,
        openStreetMapUrl: 'https://www.openstreetmap.org/?mlat=3.1096&mlon=101.6371#map=17/3.1096/101.6371',
      }),
    ).toBe(true)
  })

  it('rejects a place id that would address a different document path', () => {
    expect(
      venueService.isValidSelection({ ...selection, placeId: 'a/b' }),
    ).toBe(false)
    expect(
      venueService.isValidSelection({ ...selection, placeId: '../../admin' }),
    ).toBe(false)
  })

  it('rejects oversized name and address strings', () => {
    expect(
      venueService.isValidSelection({ ...selection, name: 'a'.repeat(500) }),
    ).toBe(false)
    expect(
      venueService.isValidSelection({ ...selection, address: 'a'.repeat(500) }),
    ).toBe(false)
  })
})
