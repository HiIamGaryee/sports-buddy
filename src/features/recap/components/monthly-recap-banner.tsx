import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthlyRecapDialog } from '@/features/recap/components/monthly-recap-dialog'
import { useMonthlyRecap } from '@/features/recap/use-monthly-recap'
import { getSportName } from '@/lib/profile-format'
import { ROUTES } from '@/routes/routes'

const MAX_SPORTS_TEASED = 3

/**
 * The Profile teaser for last month's recap. Deliberately a summary: the full
 * statistics, the venues and the share card all live behind "View & share",
 * so this never becomes a second profile page.
 */
export function MonthlyRecapBanner({ displayName }: { displayName: string | null }) {
  const { recap, isLoading, error } = useMonthlyRecap({ initialMonth: 'previous' })
  const [isOpen, setIsOpen] = useState(false)

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

  /*
   * A failure used to render NOTHING here, which hid a real problem: if the
   * recap query is refused (a missing Firestore index, say), the whole feature
   * simply vanished from the app and looked like it had never been built. It
   * now says so quietly, and still offers the way in.
   */
  if (error || !recap) {
    return (
      <Card variant="subtle">
        <CardContent className="flex flex-col gap-3">
          <span className="text-title text-card-foreground">Monthly recap</span>
          <p className="text-body-small text-muted-foreground">
            {error || "We couldn't build your recap just now."}
          </p>
          <Button variant="outline" asChild className="w-fit">
            <Link to={ROUTES.recap}>Open monthly recap</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const month = recap.monthLabel.split(' ')[0]?.toUpperCase() ?? 'MONTHLY'

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
    <>
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
            {recap.topSport && (
              <p className="text-body-small text-muted-foreground">
                Your most active sport was {getSportName(recap.topSport.sportId)}.
              </p>
            )}
            {/* This banner always shows the month that has ENDED, so it is
                final — built from the sessions already in your history. */}
            <p className="text-caption text-muted-foreground">
              Complete — built from your sessions once {recap.monthLabel} ended.
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {recap.sports.slice(0, MAX_SPORTS_TEASED).map((sport) => (
                <li key={sport.sportId} className="inline-flex items-baseline gap-1.5 text-body-small text-muted-foreground">
                  <span>{getSportName(sport.sportId)}</span>
                  <span className="font-semibold text-card-foreground">{sport.count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 md:items-end">
            <Button
              size="lg"
              onClick={() => setIsOpen(true)}
              className="w-full rounded-[1.25rem] px-8 font-semibold shadow-sm md:w-auto"
            >
              View &amp; share
            </Button>
            {/* The full page is where every earlier month lives. */}
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.recap}>See every month</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <MonthlyRecapDialog
        recap={recap}
        displayName={displayName}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </>
  )
}
