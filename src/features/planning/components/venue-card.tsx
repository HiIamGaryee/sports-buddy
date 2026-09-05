import { MapPin, Star } from 'lucide-react'

import { SafeExternalLink } from '@/components/common/external-link'
import { Button } from '@/components/ui/button'
import { formatDistance } from '@/lib/geo'
import { cn } from '@/lib/utils'
import { venueService } from '@/services/venue/venue-service'
import type { PlanningSearchArea, Venue } from '@/types/venue'

/**
 * One venue. Everything shown here is either from the provider or derived
 * from public coordinates — there is deliberately no price, no availability
 * and no travel time, because none of those are real data yet.
 *
 * Distance is from the SEARCH AREA, never from a person.
 */
export function VenueCard({
  venue,
  area,
  isSelected,
  isProposing,
  onSelect,
  onPropose,
}: {
  venue: Venue
  area: PlanningSearchArea
  isSelected: boolean
  isProposing: boolean
  onSelect: (venueId: string) => void
  onPropose: (venue: Venue) => void
}) {
  const distance = formatDistance(
    venueService.distanceFromSearchArea(venue, area),
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-ui',
        isSelected
          ? 'border-primary bg-primary-gradient-soft'
          : 'border-border hover:border-border-strong hover:shadow-hover',
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={() => onSelect(venue.id)}
        className="flex flex-col items-start gap-1 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex items-center gap-2 text-title text-card-foreground">
          {venue.name}
          {isSelected && (
            <span className="text-caption text-primary uppercase">Selected</span>
          )}
        </span>
        <span className="text-body-small text-muted-foreground">
          {venue.address}
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-small text-muted-foreground">
        {venue.rating !== null && (
          <span className="flex items-center gap-1">
            <Star aria-hidden className="size-3.5 text-primary" />
            {venue.rating.toFixed(1)}
            {venue.ratingCount !== null && (
              <span className="text-caption">({venue.ratingCount})</span>
            )}
          </span>
        )}
        {distance && (
          <span className="flex items-center gap-1">
            <MapPin aria-hidden className="size-3.5" />
            {distance} from the search area
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={isProposing}
          aria-label={`Suggest ${venue.name} to your sports buddy`}
          onClick={() => onPropose(venue)}
        >
          {isProposing ? 'Suggesting…' : 'Suggest venue'}
        </Button>
        <SafeExternalLink
          size="sm"
          href={venueService.mapsUrl(venue)}
          label="Open in Maps"
          ariaLabel={`Open ${venue.name} in Google Maps`}
        />
      </div>
    </div>
  )
}
