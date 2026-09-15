import { MapPin, Navigation } from 'lucide-react'
import { useRef } from 'react'

import compassIllustration from '@/assets/svg/compas-svgrepo-com.svg'
import { EmptyState } from '@/components/common/empty-state'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AppDropdown } from '@/components/ui/AppDropdown'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SPORTS } from '@/constants/sports'
import { VenueMap } from '@/features/map/components/venue-map'
import { useVenueMapSearch } from '@/features/map/use-venue-map-search'
import type { SportId } from '@/types/sports-profile'

const RADIUS_OPTIONS = [10, 50, 200] as const

function formatDistance(distanceKm: number) {
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1_000)} m away`
    : `${distanceKm.toFixed(1)} km away`
}

export function MapPage() {
  const {
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
  } = useVenueMapSearch()
  const resultRefs = useRef(new Map<string, HTMLButtonElement>())

  const selectVenue = (venueId: string) => {
    setSelectedId(venueId)
    resultRefs.current.get(venueId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }


  return (
    <>
      <AppHeader title="Map" subtitle="Find a place to play near you." size="wide" />
      <PageContainer size="wide">
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_8rem_auto]">
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              aria-label="Location"
              placeholder="Location"
              className="sm:col-span-2 lg:col-span-1"
            />
            <AppDropdown
              value={sportId}
              onChange={(value) => setSportId(value as SportId)}
              options={SPORTS.map(({ id, name }) => ({ value: id, label: name }))}
              ariaLabel="Sport"
            />
            <AppDropdown
              value={String(radius)}
              onChange={(value) => setRadius(Number(value))}
              options={RADIUS_OPTIONS.map((value) => ({ value: String(value), label: `${value} km` }))}
              ariaLabel="Search radius"
            />
            <Button onClick={() => void search()} disabled={status === 'loading'}>
              <Navigation className="size-4" />
              {status === 'loading' ? 'Searching…' : 'Search'}
            </Button>
          </div>

          {status === 'idle' && (
            <EmptyState
              illustration={compassIllustration}
              title="Find somewhere to play"
              description="Search live OpenStreetMap data for nearby sports venues."
            />
          )}

          {status === 'loading' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.8fr)]">
              <Skeleton className="h-75 rounded-2xl lg:h-150" />
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-2xl" />)}
              </div>
            </div>
          )}

          {status === 'error' && (
            <EmptyState illustration={compassIllustration} title="Map unavailable" description={error} />
          )}

          {status === 'searched' && searchLocation && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.8fr)]">
              <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
                <VenueMap
                  searchId={searchId}
                  searchLocation={searchLocation}
                  venues={venues}
                  selectedId={selectedId}
                  onSelect={selectVenue}
                />
              </section>

              <section className="flex min-h-0 flex-col gap-3 lg:max-h-150">
                <h2 className="sticky top-0 z-10 bg-background py-1 text-heading-3">
                  Nearby venues{venues.length > 0 && ` (${venues.length})`}
                </h2>
                {venues.length === 0 ? (
                  <EmptyState
                    illustration={compassIllustration}
                    title="No venues found nearby"
                    description={`No ${SPORTS.find(({ id }) => id === sportId)?.name.toLowerCase()} venues found within ${radius} km. Try increasing your radius or searching another area.`}
                  />
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-1 lg:pr-1">
                    {venues.map((venue) => (
                      <button
                        key={venue.id}
                        ref={(element) => {
                          if (element) resultRefs.current.set(venue.id, element)
                          else resultRefs.current.delete(venue.id)
                        }}
                        type="button"
                        aria-pressed={selectedId === venue.id}
                        onClick={() => selectVenue(venue.id)}
                        className="text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <Card variant={selectedId === venue.id ? 'selected' : 'interactive'}>
                          <CardContent className="flex flex-col gap-2">
                            <span className="text-title">{venue.name}</span>
                            <span className="flex items-start gap-1.5 text-body-small text-muted-foreground">
                              <MapPin className="mt-0.5 size-3.5 shrink-0" />
                              {venue.address}
                            </span>
                            <span className="text-body-small text-primary">
                              {formatDistance(venue.distanceKm)}
                            </span>
                          </CardContent>
                        </Card>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  )
}
