import { Link } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RateBuddyDialog } from '@/features/ratings/components/rate-buddy-dialog'
import { useBuddyRatings } from '@/features/ratings/use-buddy-ratings'
import { canReviewActivity } from '@/features/ratings/mock-ratings'
import type { CompletedActivity } from '@/types/buddy-rating'
import { buddyProfilePath } from '@/routes/routes'
import { getInitials } from '@/lib/initials'

export function CompletedActivityCard({
  activity,
  reviewerId,
}: {
  activity: CompletedActivity
  reviewerId: string
}) {
  const { reviews } = useBuddyRatings()
  const canReview = canReviewActivity(activity, reviewerId, reviews)
  const hasReview = reviews.some(
    (review) =>
      review.eventId === activity.id &&
      review.reviewerId === reviewerId &&
      review.reviewedUserId === activity.buddy.id,
  )

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-title text-card-foreground">
            {activity.activity}
          </span>
          <span className="text-body-small text-muted-foreground">
            {activity.venue}
          </span>
          <span className="text-body-small text-muted-foreground">
            {activity.date} · {activity.time}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-body-small text-muted-foreground">Played with:</span>
          <Avatar className="size-8">
            {activity.buddy.avatar && (
              <AvatarImage src={activity.buddy.avatar} alt={activity.buddy.name} />
            )}
            <AvatarFallback className="text-caption">
              {getInitials(activity.buddy.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-title text-card-foreground">
            {activity.buddy.name}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" asChild>
            <Link to={buddyProfilePath(activity.buddy.id)}>View Buddy</Link>
          </Button>
          {canReview ? (
            <RateBuddyDialog
              activity={activity}
              reviewerId={reviewerId}
              trigger={<Button size="sm">Rate Buddy</Button>}
            />
          ) : hasReview ? (
            <Button variant="outline" size="sm" disabled>
              Reviewed
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
