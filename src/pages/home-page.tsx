import { CalendarDays, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/common/empty-state'
import { SectionHeader } from '@/components/common/section-header'
import { AppHeader } from '@/components/layout/app-header'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusPill } from '@/components/ui/status-pill'
import { Badge } from '@/components/ui/badge'
import { APP_NAME, APP_TAGLINE_LINES } from '@/constants/app'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityCard } from '@/features/activities/components/activity-card'
import { useUpcomingActivities } from '@/features/activities/use-activities'
import { useProfile } from '@/hooks/use-profile'
import { getAreaName, getSportName } from '@/lib/profile-format'
import { ROUTES } from '@/routes/routes'

export function HomePage() {
  const { profile } = useProfile()
  const { items, isLoading: isLoadingActivities } = useUpcomingActivities()
  const firstName = profile?.displayName.split(' ')[0]
  const nextActivity = items[0] ?? null

  return (
    <>
      <AppHeader
        title={APP_NAME}
        subtitle={firstName ? `Ready to move, ${firstName}?` : 'Ready to move?'}
        size="wide"
      />
      <PageContainer size="wide">
        {profile && profile.sports.length > 0 && (
          <section className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground uppercase">
              {getAreaName(profile.area)}
              {profile.radiusKm !== null && ` · within ${profile.radiusKm} km`}
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.sports.map(({ sportId }) => (
                <Badge key={sportId} variant="outline">
                  {getSportName(sportId)}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Two columns from `lg`: the quick action beside upcoming activities,
            so a desktop Home reads as a dashboard rather than a tall column.
            Same content, same data — only the arrangement changes. */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <Card className="border-primary/30 bg-card">
          <CardContent className="flex flex-col gap-4">
            <StatusPill tone="success" icon={Sparkles}>
              Get started
            </StatusPill>
            <div className="flex flex-col gap-2">
              <p className="text-heading-1 text-card-foreground">
                {APP_TAGLINE_LINES.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <p className="text-body text-muted-foreground">
                Meet compatible sports buddies and turn a connection into a
                real activity.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button size="lg" asChild className="sm:flex-1">
                <Link to={ROUTES.discover}>Find a Buddy</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="sm:flex-1">
                <Link to={ROUTES.activities}>View Activities</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="flex flex-col gap-3">
          <SectionHeader title="Upcoming" />
          {isLoadingActivities ? (
            <Skeleton className="h-36 w-full rounded-2xl" />
          ) : nextActivity ? (
            // The soonest confirmed activity, from the same sorted list the
            // Activities page uses — no separate query, no extra logic.
            <ActivityCard item={nextActivity} />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming activities yet."
              description="Once you plan a session with a buddy, it shows up here."
            />
          )}
        </section>
        </div>
      </PageContainer>
    </>
  )
}
