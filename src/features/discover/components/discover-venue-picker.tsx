import { MapPin, Search } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useVenueMapSearch } from '@/features/map/use-venue-map-search'
import type { SportId } from '@/types/sports-profile'

/**
 * Compact OpenStreetMap venue picker for the activity-post flow.
 * It reuses the Map page search but deliberately leaves the map out here.
 */
export function DiscoverVenuePicker({
  sportId,
  initialLocation,
  value,
  onSelectVenue,
}: {
  sportId: SportId
  initialLocation: string
  value: string
  onSelectVenue: (venueName: string) => void
}) {
  const [query, setQuery] = useState(initialLocation)
  const [resultsOpen, setResultsOpen] = useState(false)
  const { venues, status, error, search } = useVenueMapSearch({
    initialLocation,
    initialSportId: sportId,
  })

  const runSearch = async () => {
    await search(query)
    setResultsOpen(true)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-subtle p-4">
      <div className="flex items-center gap-2">
        <MapPin aria-hidden className="size-4 text-primary" />
        <div>
          <p className="text-body-small font-semibold text-foreground">Choose a venue</p>
          <p className="text-caption text-muted-foreground">Search nearby OpenStreetMap places.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Enter an area or venue"
          aria-label="Venue search location"
          className="min-w-0"
        />
        <Button type="button" size="icon" aria-label="Search OpenStreetMap venues" onClick={() => void runSearch()} disabled={!query.trim() || status === 'loading'}>
          <Search aria-hidden className="size-4" />
        </Button>
      </div>
      {value && <p className="truncate text-body-small text-primary">Selected: {value}</p>}
      {error && <p role="alert" className="text-body-small text-destructive">{error}</p>}
      {status === 'searched' && (
        <Button type="button" variant="outline" className="w-full" onClick={() => setResultsOpen(true)}>
          {venues.length > 0 ? `Choose from ${venues.length} venues` : 'View search results'}
        </Button>
      )}

      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a venue</DialogTitle>
            <DialogDescription>Results from OpenStreetMap near {query}.</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {venues.length === 0 && <p className="text-body-small text-muted-foreground">No venues found. Try another area or search term.</p>}
            {venues.map((venue) => (
              <button
                key={venue.id}
                type="button"
                className="flex flex-col items-start gap-1 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                onClick={() => {
                  onSelectVenue(venue.name)
                  setResultsOpen(false)
                }}
              >
                <span className="text-body-small font-semibold text-foreground">{venue.name}</span>
                <span className="text-caption text-muted-foreground">{venue.address || 'Address unavailable'}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
