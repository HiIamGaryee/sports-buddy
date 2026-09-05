import { MapPin, Search } from 'lucide-react'

import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getAreaName } from '@/lib/profile-format'
import { VenueCard } from '@/features/planning/components/venue-card'
import { VenueMap } from '@/features/planning/components/venue-map'
import { isMapsConfigured } from '@/services/google/maps-loader'
import { venueService } from '@/services/venue/venue-service'
import type { PlanningSearchArea, Venue } from '@/types/venue'
import type { SportId } from '@/types/sports-profile'

const SKELETON_CARDS = [0, 1, 2]

/**
 * Venue discovery for an agreed sport, around the midpoint of the two
 * PROFILE AREAS — never a live position, and the copy says so.
 *
 * Layout: map above the list on a phone, side by side from `lg`. The list is
 * the primary surface at every width; the map is an enhancement, and every
 * venue on it is selectable from the list too.
 */
export function VenueStep({
  sportId,
  area,
  venues,
  query,
  isLoading,
  error,
  isConfigurationError,
  selectedVenueId,
  proposingVenueId,
  onQueryChange,
  onSelect,
  onPropose,
  onRetry,
}: {
  sportId: SportId
  area: PlanningSearchArea
  venues: readonly Venue[]
  query: string
  isLoading: boolean
  error: string
  isConfigurationError: boolean
  selectedVenueId: string | null
  proposingVenueId: string | null
  onQueryChange: (query: string) => void
  onSelect: (venueId: string) => void
  onPropose: (venue: Venue) => void
  onRetry: () => void
}) {
  const areaNames = area.areaIds.map((id) => getAreaName(id)).join(' and ')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="venue-search" className="text-label text-foreground">
          Search venues
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="venue-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={`Try "${venueService.getSearchLabel(sportId)}" or a place name`}
            className="pl-9"
          />
        </div>
        {/* Honest wording: these are the areas on the two profiles, not
            anybody's live position. */}
        <p className="flex items-center gap-1.5 text-body-small text-muted-foreground">
          <MapPin aria-hidden className="size-3.5 shrink-0" />
          Searching around the midpoint of {areaNames}.
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
        <div className="order-2 flex min-w-0 flex-col gap-3 lg:order-1">
          {isLoading &&
            SKELETON_CARDS.map((key) => (
              <Skeleton key={key} className="h-36 w-full rounded-2xl" />
            ))}

          {!isLoading && error && (
            <div className="flex flex-col items-start gap-4">
              <EmptyState
                icon={MapPin}
                title={
                  isConfigurationError ? 'Venue search is not configured.' : error
                }
                description={
                  isConfigurationError
                    ? error
                    : 'Something went wrong on our side, not yours.'
                }
                className="w-full"
              />
              {!isConfigurationError && (
                <Button variant="outline" onClick={onRetry}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {!isLoading && !error && venues.length === 0 && (
            <EmptyState
              icon={MapPin}
              title={`No ${venueService.getSearchLabel(sportId)} found near the suggested area.`}
              description="Try a broader search, a different keyword, or another place name."
              className="w-full"
            />
          )}

          {!isLoading &&
            !error &&
            venues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                area={area}
                isSelected={venue.id === selectedVenueId}
                isProposing={proposingVenueId === venue.id}
                onSelect={onSelect}
                onPropose={onPropose}
              />
            ))}
        </div>

        {/* Enhancement only: `VenueMap` renders nothing if Maps fails, and
            the list above stays completely usable. */}
        {isMapsConfigured() && venues.length > 0 && (
          <VenueMap
            venues={venues}
            selectedVenueId={selectedVenueId}
            center={area.center}
            onSelect={onSelect}
            className="order-1 h-60 lg:sticky lg:top-6 lg:order-2 lg:h-[28rem]"
          />
        )}
      </div>
    </div>
  )
}
