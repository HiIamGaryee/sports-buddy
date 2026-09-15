import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthlyRecapDialog } from '@/features/recap/components/monthly-recap-dialog'
import { useMonthlyRecap } from '@/features/recap/use-monthly-recap'
import { getMonthName } from '@/lib/calendar-month'
import { ROUTES } from '@/routes/routes'

const MAX_SPORTS_TEASED = 3

/**
 * The Profile teaser for last month's recap. Deliberately a summary: the full
 * statistics, the venues and the share card all live behind "View & share",
 * so this never becomes a second profile page.
 */
export function MonthlyRecapBanner({ displayName }: { displayName: string | null }) {
  const { recap, isLoading, error } = useMonthlyRecap()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return (
      <Card variant="subtle">
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-full max-w-sm" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </CardContent>
      </Card>
    )
  }

  // A recap is a bonus, not profile identity: if it fails it stays silent
  // rather than putting an error banner under someone's profile.
  if (error || !recap) return null

  const month = getMonthName(recap).toUpperCase()

  if (recap.totalSessions === 0) {
    return (
      <Card variant="subtle">
        <CardContent className="flex flex-col gap-3">
          <span className="text-caption text-muted-foreground uppercase">
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
      <Card variant="subtle" className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-col gap-3">
            <span className="text-caption text-primary uppercase">
              {month} recap
            </span>
            <span className="text-display text-card-foreground">
              {recap.totalSessions} {recap.totalSessions === 1 ? 'session' : 'sessions'}.
            </span>
            {recap.topSport && (
              <p className="text-body-small text-muted-foreground">
                Your most active sport was {recap.topSport.label}.
              </p>
            )}
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {recap.sports.slice(0, MAX_SPORTS_TEASED).map((sport) => (
                <li key={sport.label} className="text-body-small text-muted-foreground">
                  {sport.label}{' '}
                  <span className="text-card-foreground">{sport.sessions}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            size="lg"
            onClick={() => setIsOpen(true)}
            className="w-full shrink-0 sm:w-auto"
          >
            View &amp; share
          </Button>
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
