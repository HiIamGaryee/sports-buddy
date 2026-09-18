import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMonthlyRecap } from '@/features/recap/use-monthly-recap'
import { getSportName } from '@/lib/profile-format'
import { ROUTES } from '@/routes/routes'

const MAX_SPORTS_TEASED = 3

/**
 * The Profile teaser for the member's monthly recap. Deliberately a summary: the full
 * statistics, the venues and the share card all live behind "View & share",
 * so this never becomes a second profile page.
 */
export function MonthlyRecapBanner() {
  const { recap, isLoading, error } = useMonthlyRecap()

  if (isLoading) {
    return (
      <Card className="sm:[--card-spacing:--spacing(6)] lg:[--card-spacing:--spacing(8)]">
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card variant="subtle">
        <CardContent className="flex flex-col gap-3">
          <span className="text-caption tracking-wide text-primary uppercase">
            Monthly recap
          </span>
          <p role="alert" className="text-body-small text-muted-foreground">
            {error}
          </p>
          <Button variant="outline" asChild className="w-fit">
            <Link to={ROUTES.recap}>Open recap</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!recap) return null

  const month = recap.monthLabel.toUpperCase()
  const topSport = recap.sports[0]

  if (recap.totalSessions === 0) {
    return (
      <Card className="relative overflow-hidden sm:[--card-spacing:--spacing(6)] lg:[--card-spacing:--spacing(8)]">
        <div aria-hidden="true" className="absolute left-0 top-0 h-1 w-24 bg-primary-gradient" />
        <CardContent className="flex flex-col gap-3">
          <span className="text-caption tracking-wide text-primary uppercase">
            {month} recap
          </span>
          <span className="text-heading-2 text-card-foreground">
            No activities last month.
          </span>
          <p className="text-body-small text-muted-foreground">
            New month, new moves.
          </p>
          <Button variant="outline" asChild className="w-fit">
            <Link to={ROUTES.activities}>View activity history</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden sm:[--card-spacing:--spacing(6)] lg:[--card-spacing:--spacing(8)]">
      <div aria-hidden="true" className="absolute left-0 top-0 h-1 w-24 bg-primary-gradient" />
      <CardContent className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <span className="text-caption tracking-wide text-primary uppercase">
            {month} recap
          </span>
          <span className="text-heading-1 leading-none text-card-foreground sm:text-display md:text-[2.5rem]">
            {recap.totalSessions} {recap.totalSessions === 1 ? 'session' : 'sessions'}.
          </span>
          {topSport && (
            <p className="text-body-small text-muted-foreground">
              Your most active sport was {getSportName(topSport.sportId)}.
            </p>
          )}
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {recap.sports.slice(0, MAX_SPORTS_TEASED).map((sport) => (
              <li key={sport.sportId} className="inline-flex items-baseline gap-1.5 text-body-small text-muted-foreground">
                <span>{getSportName(sport.sportId)}</span>
                <span className="font-semibold text-card-foreground">{sport.count}</span>
              </li>
            ))}
          </ul>
          <p className="text-body-small text-muted-foreground">
            {recap.verifiedSessions} verified ·{' '}
            {recap.showUpRatePercent === null ? 'No show-up rate yet' : `${recap.showUpRatePercent}% show-up rate`}
          </p>
        </div>

        <Button
          size="lg"
          asChild
          className="w-full shrink-0 rounded-[1.25rem] px-8 font-semibold shadow-sm md:w-auto"
        >
          <Link to={ROUTES.recap}>View &amp; share</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
