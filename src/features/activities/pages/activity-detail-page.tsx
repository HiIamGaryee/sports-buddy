import { Link, useParams } from 'react-router-dom'
import { CalendarDays, Clock, Users, Wallet } from 'lucide-react'

import { DetailTile } from '@/components/common/detail-tile'
import { SafeExternalLink } from '@/components/common/external-link'
import { validDocumentId } from '@/lib/ids'
import { isTrustedMapsUrl } from '@/lib/safe-url'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityStatusBadge } from '@/features/activities/components/activity-status-badge'
import { useActivity } from '@/features/activities/use-activity'
import { VenueMap } from '@/features/planning/components/venue-map'
import {
  formatActivityDate,
  formatActivityTimeRange,
  formatDuration,
} from '@/lib/activity-format'
import { buildGoogleMapsUrl } from '@/lib/geo'
import { formatBudget, getSportName } from '@/lib/profile-format'
import { ROUTES } from '@/routes/routes'
import { isMapsConfigured } from '@/services/google/maps-loader'

export function ActivityDetailPage() {
  const { activityId: rawActivityId } = useParams<{ activityId: string }>()
  // A route param is untrusted input on its way to `doc(db, COLLECTION, id)`.
  // An invalid id becomes `undefined`, which the hook already treats as
  // "nothing to load", so the page shows its normal unavailable state instead
  // of building a malformed document path.
  const activityId = validDocumentId(rawActivityId) ?? undefined
  const { activity, isLoading, error, buddyName } = useActivity(activityId)

  if (isLoading) {
    return (
      <>
        <AppHeader title="Activity" size="wide" showBack />
        <PageContainer size="wide">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </PageContainer>
      </>
    )
  }

  if (!activity) {
    // Deliberately generic: it must not reveal whether the activity exists.
    return (
      <>
        <AppHeader title="Activity" size="default" showBack />
        <PageContainer size="default">
          <div className="flex flex-col items-start gap-4">
            <p role="alert" className="text-title text-foreground">
              {error || 'This activity is unavailable.'}
            </p>
            <Button variant="outline" asChild>
              <Link to={ROUTES.activities}>Back to Activities</Link>
            </Button>
          </div>
        </PageContainer>
      </>
    )
  }

  // The stored URI was written by whichever participant proposed the venue,
  // so it is only used when it is a real Google Maps link.
  const mapsUrl =
    (isTrustedMapsUrl(activity.venue.googleMapsUri)
      ? activity.venue.googleMapsUri
      : null) ??
    buildGoogleMapsUrl({
      name: activity.venue.name,
      placeId: activity.venue.placeId,
      location: activity.venue.location,
    })

  return (
    <>
      <AppHeader
        title={`${getSportName(activity.sportId)} with ${buddyName}`}
        subtitle={formatActivityDate(activity.startAt)}
        size="wide"
        showBack
      />
      <PageContainer size="wide">
        {/* Details on the left from `lg`, venue beside them — so a desktop
            activity is not one long full-width column. */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-aside-end lg:items-start lg:gap-8">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-heading-2 text-card-foreground">
                  {getSportName(activity.sportId)}
                </h2>
                <ActivityStatusBadge status={activity.status} />
              </div>

              <dl className="flex flex-col gap-2.5">
                <DetailTile as="dl"
                  icon={CalendarDays}
                  label="Date"
                  value={formatActivityDate(activity.startAt)}
                />
                <DetailTile as="dl"
                  icon={Clock}
                  label="Time"
                  value={`${formatActivityTimeRange(activity.startAt, activity.endAt)} · ${formatDuration(activity.startAt, activity.endAt)}`}
                />
                <DetailTile as="dl"
                  icon={Users}
                  label="Who"
                  value={`You and ${buddyName}`}
                />
                <DetailTile as="dl"
                  icon={Wallet}
                  label="Budget"
                  value={`${formatBudget(activity.budget)} / person`}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-caption text-muted-foreground uppercase">
                  Venue
                </h2>
                <span className="text-title text-card-foreground">
                  {activity.venue.name}
                </span>
                <span className="text-body-small text-muted-foreground">
                  {activity.venue.address}
                </span>
              </div>

              {/* Public venue coordinates, not anybody's location. An
                  enhancement only: the address above stands on its own. */}
              {isMapsConfigured() && (
                <VenueMap
                  venues={[
                    {
                      id: activity.venue.placeId,
                      name: activity.venue.name,
                      address: activity.venue.address,
                      location: activity.venue.location,
                      googleMapsUri: activity.venue.googleMapsUri,
                      rating: null,
                      ratingCount: null,
                      primaryType: null,
                      priceLevel: null,
                      businessStatus: null,
                    },
                  ]}
                  selectedVenueId={activity.venue.placeId}
                  center={activity.venue.location}
                  onSelect={() => {}}
                  className="h-48"
                />
              )}

              <SafeExternalLink
                href={mapsUrl}
                label="Open in Maps"
                ariaLabel={`Open ${activity.venue.name} in Google Maps`}
                className="sm:w-auto sm:self-start sm:px-6"
              />

              <p className="text-body-small text-muted-foreground">
                You both chose this venue. Sports Buddy doesn't reserve it —
                check with the venue if it takes bookings.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}


