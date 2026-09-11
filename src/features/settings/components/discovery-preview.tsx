import { CalendarRange, MapPin, Target, Users } from 'lucide-react'

import { DetailTile } from '@/components/common/detail-tile'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatRadius,
  getIntentLabel,
  getSkillLabel,
  getSportName,
} from '@/lib/profile-format'
import type { DiscoveryPreferences } from '@/types/preferences'

/**
 * What the draft preferences add up to, beside the controls that produce it.
 *
 * `matchCount` is a REAL count from the same candidate batch and the same hard
 * filters Discover uses — `null` while it loads. Nothing here is estimated,
 * and no distance to anybody is shown: `maxDistanceKm` is the viewer's own
 * stored radius, not a measurement.
 */
export function DiscoveryPreview({
  discovery,
  matchCount,
}: {
  discovery: DiscoveryPreferences
  matchCount: number | null
}) {
  const list = (values: string[]) =>
    values.length > 0 ? values.join(', ') : null

  return (
    <Card
      size="lg"
      variant="elevated"
      className="rounded-3xl lg:sticky lg:top-6"
    >
      <CardHeader>
        <CardTitle>Discovery preview</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-metric text-primary">
            {matchCount === null ? '—' : matchCount}
          </span>
          <span className="text-body-small text-muted-foreground">
            {matchCount === 1 ? 'buddy matches' : 'buddies match'} these
            preferences right now
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-caption text-muted-foreground uppercase">
            Sports
          </span>
          {discovery.preferredSports.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {discovery.preferredSports.map((sportId) => (
                <Badge key={sportId}>{getSportName(sportId)}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-title text-muted-foreground">
              No sports chosen
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <DetailTile
            icon={Target}
            label="Skill levels"
            value={list(discovery.preferredSkillLevels.map(getSkillLabel))}
            placeholder="None chosen"
          />
          <DetailTile
            icon={Users}
            label="Looking for"
            value={list(discovery.preferredIntents.map(getIntentLabel))}
            placeholder="None chosen"
          />
          <DetailTile
            icon={MapPin}
            label="Distance"
            value={`Within ${formatRadius(discovery.maxDistanceKm)}`}
          />
          <DetailTile
            icon={CalendarRange}
            label="Availability"
            value={
              discovery.requireAvailabilityOverlap
                ? 'Only buddies free when you are'
                : 'Any availability'
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
